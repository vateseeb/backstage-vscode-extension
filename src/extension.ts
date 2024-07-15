import axios from 'axios';
import * as vscode from 'vscode';

interface BackstageEntityMetadata {
    name: string;
    description?: string;
}

interface BackstageEntitySpec {
    type?: string;
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
    kinds: Set<string>;
    types: Set<string>;
}

let backstageSuggestions: BackstageSuggestions = {
    systems: new Map(),
    groups: new Map(),
    kinds: new Set(),
    types: new Set()
};

let debug = false;

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.fetchBackstageEntities', fetchAndProcessEntities);
    context.subscriptions.push(disposable);

    registerCompletionProviders();
}

async function fetchAndProcessEntities() {
    const backstageBaseUrl = vscode.workspace.getConfiguration().get('backstageAutocomplete.baseUrl') as string;
    debug = vscode.workspace.getConfiguration().get('backstageAutocomplete.debug') === true;

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
        kinds: new Set(),
        types: new Set()
    };

    for (const entity of response.data) {
        backstageSuggestions.kinds.add(entity.kind);
        
        if (entity.kind === 'System') {
            backstageSuggestions.systems.set(entity.metadata.name, entity.metadata.description || '');
        } else if (entity.kind === 'Group') {
            backstageSuggestions.groups.set(entity.metadata.name, entity.metadata.description || '');
        }

        if (entity.spec && entity.spec.type) {
            backstageSuggestions.types.add(entity.spec.type);
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
                if (linePrefix.endsWith('system: ')) {
                    return provideSystemSuggestions();
                } else if (linePrefix.endsWith('kind: ')) {
                    return provideKindSuggestions();
                } else if (linePrefix.endsWith('owner: ')) {
                    return provideGroupSuggestions();
                } else if (linePrefix.endsWith('type: ')) {
                    return provideTypeSuggestions();
                }
                return undefined;
            }
        }
    );
}

function provideSystemSuggestions(): vscode.CompletionItem[] {
    return Array.from(backstageSuggestions.systems.entries()).map(([name, description]) => 
        createCompletionItem(name, description, 'System')
    );
}

function provideGroupSuggestions(): vscode.CompletionItem[] {
    return Array.from(backstageSuggestions.groups.entries()).map(([name, description]) => 
        createCompletionItem(name, description, 'Group')
    );
}

function provideKindSuggestions(): vscode.CompletionItem[] {
    return Array.from(backstageSuggestions.kinds).map(kind => {
        const completionItem = new vscode.CompletionItem(kind, vscode.CompletionItemKind.Value);
        completionItem.detail = `Backstage entity kind: ${kind}`;
        return completionItem;
    });
}

function provideTypeSuggestions(): vscode.CompletionItem[] {
    return Array.from(backstageSuggestions.types).map(type => {
        const completionItem = new vscode.CompletionItem(type, vscode.CompletionItemKind.Value);
        completionItem.detail = `Backstage entity type: ${type}`;
        return completionItem;
    });
}

function createCompletionItem(name: string, description: string, kind: string): vscode.CompletionItem {
    const completionItem = new vscode.CompletionItem(name, vscode.CompletionItemKind.Value);
    completionItem.detail = description || `${kind} entity`;
    return completionItem;
}

export function deactivate() {}