import axios from 'axios';
import * as vscode from 'vscode';

interface BackstageEntityMetadata {
    name: string;
    description?: string;
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
    tags?: string[];
    links?: Array<{
        url: string;
        title?: string;
        icon?: string;
        type?: string;
    }>;
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

interface BackstageCatalog {
    entities: BackstageEntity[];
    systems: Set<BackstageEntity>;
    groups: Set<BackstageEntity>;
    kinds: Set<string>;
}

let backstageCatalog: BackstageCatalog = {
    entities: [],
    systems: new Set(),
    groups: new Set(),
    kinds: new Set()
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
        backstageCatalog = await fetchBackstageEntities(apiUrl);
        vscode.window.showInformationMessage('Backstage entities fetched successfully!');
    } catch (error: unknown) {
        vscode.window.showErrorMessage('Failed to fetch Backstage entities: ' + (error as Error).message);
    }
}

async function fetchBackstageEntities(apiUrl: string): Promise<BackstageCatalog> {
    const response = await axios.get<BackstageEntity[]>(`${apiUrl}/catalog/entities`);
    
    if (debug) {
        showDebugInfo(response.data);
    }

    const entities = response.data;

    return {
        entities,
        systems: new Set(entities.filter(entity => entity.kind === 'System')),
        groups: new Set(entities.filter(entity => entity.kind === 'Group')),
        kinds: new Set(entities.map(entity => entity.kind))
    };
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
                }
                return undefined;
            }
        }
    );
}

function provideSystemSuggestions(): vscode.CompletionItem[] {
    return Array.from(backstageCatalog.systems).map(createCompletionItem);
}

function provideGroupSuggestions(): vscode.CompletionItem[] {
    return Array.from(backstageCatalog.groups).map(createCompletionItem);
}

function provideKindSuggestions(): vscode.CompletionItem[] {
    return Array.from(backstageCatalog.kinds).map(kind => {
        const completionItem = new vscode.CompletionItem(kind, vscode.CompletionItemKind.Value);
        completionItem.detail = `Backstage entity kind: ${kind}`;
        return completionItem;
    });
}

function createCompletionItem(entity: BackstageEntity): vscode.CompletionItem {
    const completionItem = new vscode.CompletionItem(entity.metadata.name, vscode.CompletionItemKind.Value);
    completionItem.detail = entity.metadata.description || `${entity.kind} entity`;
    return completionItem;
}

export function deactivate() {}