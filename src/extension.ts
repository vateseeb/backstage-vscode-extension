import axios from 'axios';
import * as vscode from 'vscode';

interface BackstageEntityMetadata {
    name: string;
    description?: string;
}

interface BackstageEntitySpec {
    type?: string;
    lifecycle?: string;
    owner?: string;
    system?: string;
    [key: string]: any; // For other potential fields in spec
}

interface BackstageEntity {
    apiVersion: string;
    kind: string;
    metadata: BackstageEntityMetadata;
    spec: BackstageEntitySpec;
}

interface BackstageSuggestions {
    systems: Map<string, string>; // name -> description
    groups: Map<string, string>; // name -> description
    components: Map<string, string>; // name -> description
    resources: Map<string, string>; // name -> description
    kinds: Set<string>;
    types: Set<string>;
    lifecycles: Set<string>;
}

let backstageSuggestions: BackstageSuggestions = {
    systems: new Map(),
    groups: new Map(),
    components: new Map(),
    resources: new Map(),
    kinds: new Set(),
    types: new Set(),
    lifecycles: new Set()
};

let debug = false;

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.fetchBackstageEntities', fetchAndProcessEntities);
    context.subscriptions.push(disposable);

    registerCompletionProviders();
}

async function fetchAndProcessEntities() {
    const backstageBaseUrl = vscode.workspace.getConfiguration().get('backstageCatalogHelper.baseUrl') as string;
    debug = vscode.workspace.getConfiguration().get('backstageCatalogHelper.debug') === true;

    if (!backstageBaseUrl) {
        vscode.window.showErrorMessage('Backstage base URL is not configured. Please set it in the settings.');
        return;
    }

    const apiUrl = `${backstageBaseUrl}/api`;

    try {
        await fetchBackstageEntities(apiUrl);
        vscode.window.showInformationMessage('Backstage entities processed successfully!');
    } catch (error: unknown) {
        vscode.window.showErrorMessage('Failed to fetch Backstage entities: ' + (error as Error).message);
    }
}

async function fetchBackstageEntities(apiUrl: string): Promise<void> {
    const response = await axios.get<BackstageEntity[]>(`${apiUrl}/catalog/entities`);
    
    if (debug) {
        showDebugInfo(response.data);
    }

    backstageSuggestions = {
        systems: new Map(),
        groups: new Map(),
        components: new Map(),
        resources: new Map(),
        kinds: new Set(),
        types: new Set(),
        lifecycles: new Set()
    };

    for (const entity of response.data) {
        backstageSuggestions.kinds.add(entity.kind);
        
        switch(entity.kind) {
            case 'System':
                backstageSuggestions.systems.set(entity.metadata.name, entity.metadata.description || '');
                break;
            case 'Group':
                backstageSuggestions.groups.set(entity.metadata.name, entity.metadata.description || '');
                break;
            case 'Component':
                backstageSuggestions.components.set(entity.metadata.name, entity.metadata.description || '');
                break;
            case 'Resource':
                backstageSuggestions.resources.set(entity.metadata.name, entity.metadata.description || '');
                break;
        }

        if (entity.spec) {
            if (entity.spec.type) backstageSuggestions.types.add(entity.spec.type);
            if (entity.spec.lifecycle) backstageSuggestions.lifecycles.add(entity.spec.lifecycle);
        }
    }
}

function showDebugInfo(data: any) {
    vscode.workspace.openTextDocument({ content: JSON.stringify(data, null, 2) }).then(doc => {
        vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside });
    });
}

function registerCompletionProviders() {
    vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: 'yaml' },
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                const match = linePrefix.match(/(\w+):\s*(\w*)$/);
                
                if (match) {
                    const [, key, partialValue] = match;
                    switch(key) {
                        case 'system':
                            return provideFilteredMapSuggestions(backstageSuggestions.systems, 'System', partialValue);
                        case 'kind':
                            return provideFilteredSetSuggestions(backstageSuggestions.kinds, 'Kind', partialValue);
                        case 'owner':
                            return provideFilteredMapSuggestions(backstageSuggestions.groups, 'Group', partialValue);
                        case 'type':
                            return provideFilteredSetSuggestions(backstageSuggestions.types, 'Type', partialValue);
                        case 'lifecycle':
                            return provideFilteredSetSuggestions(backstageSuggestions.lifecycles, 'Lifecycle', partialValue);
                        case 'component':
                            return provideFilteredMapSuggestions(backstageSuggestions.components, 'Component', partialValue);
                        case 'resource':
                            return provideFilteredMapSuggestions(backstageSuggestions.resources, 'Resource', partialValue);
                    }
                }
                return undefined;
            }
        }
    );
}

function provideFilteredMapSuggestions(map: Map<string, string>, kind: string, partialValue: string): vscode.CompletionItem[] {
    return Array.from(map.entries())
        .filter(([name]) => name.toLowerCase().startsWith(partialValue.toLowerCase()))
        .map(([name, description]) => createCompletionItem(name, description, kind));
}

function provideFilteredSetSuggestions(set: Set<string>, kind: string, partialValue: string): vscode.CompletionItem[] {
    return Array.from(set)
        .filter(value => value.toLowerCase().startsWith(partialValue.toLowerCase()))
        .map(value => {
            const completionItem = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
            completionItem.detail = `Backstage entity ${kind.toLowerCase()}: ${value}`;
            return completionItem;
        });
}

function createCompletionItem(name: string, description: string, kind: string): vscode.CompletionItem {
    const completionItem = new vscode.CompletionItem(name, vscode.CompletionItemKind.Value);
    completionItem.detail = description || `${kind} entity`;
    return completionItem;
}

export function deactivate() {}