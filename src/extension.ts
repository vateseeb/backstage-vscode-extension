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
    apis: Map<string, string>; // name -> description
}

let backstageSuggestions: BackstageSuggestions = {
    systems: new Map(),
    groups: new Map(),
    components: new Map(),
    resources: new Map(),
    kinds: new Set(),
    types: new Set(),
    lifecycles: new Set(),
    apis: new Map(),
};

let debug = false;

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.fetchBackstageEntities', () => fetchAndProcessEntities(context));
    context.subscriptions.push(disposable);

    registerCompletionProviders();
}

async function fetchAndProcessEntities(context: vscode.ExtensionContext) {
    const backstageBaseUrl = vscode.workspace.getConfiguration().get('backstageCatalogHelper.baseUrl') as string;
    let authMethod = vscode.workspace.getConfiguration().get('backstageCatalogHelper.authMethod') as string;
    debug = vscode.workspace.getConfiguration().get('backstageCatalogHelper.debug') === true;

    if (!backstageBaseUrl) {
        vscode.window.showErrorMessage('Backstage base URL is not configured. Please set it in the settings.');
        return;
    }

    const apiUrl = `${backstageBaseUrl}/api`;

    try {
        await fetchBackstageEntities(apiUrl, authMethod, context);
        vscode.window.showInformationMessage('Backstage entities processed successfully!');
    } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            const action = await vscode.window.showErrorMessage(
                'Authentication failed. Would you like to re-enter your credentials or change the authentication method?',
                'Re-enter Credentials',
                'Change Auth Method'
            );

            if (action === 'Re-enter Credentials') {
                await clearStoredCredentials(context, authMethod);
                // Retry fetching with cleared credentials (will prompt for new ones)
                await fetchAndProcessEntities(context);
            } else if (action === 'Change Auth Method') {
                const newAuthMethod = await promptForAuthMethod();
                if (newAuthMethod) {
                    await updateAuthMethodSetting(newAuthMethod);
                    // Retry fetching with the new auth method
                    await fetchAndProcessEntities(context);
                }
            }
        } else {
            vscode.window.showErrorMessage('Failed to fetch Backstage entities: ' + (error as Error).message);
        }
    }
}

async function fetchBackstageEntities(apiUrl: string, authMethod: string, context: vscode.ExtensionContext): Promise<void> {
    let headers = {};
    
    if (authMethod === 'basic') {
        const credentials = await getCredentials(context);
        if (credentials) {
            headers = {
                'Authorization': `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`
            };
        } else {
            throw new Error('Failed to get credentials');
        }
    } else if (authMethod === 'bearer') {
        const token = await getToken(context);
        if (token) {
            headers = {
                'Authorization': `Bearer ${token}`
            };
        } else {
            throw new Error('Failed to get token');
        }
    }

    const response = await axios.get<BackstageEntity[]>(`${apiUrl}/catalog/entities`, { headers });
    
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
        lifecycles: new Set(),
        apis: new Map(),
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
            case "API":
                backstageSuggestions.apis.set(entity.metadata.name, entity.metadata.description || '');
                break;
        }

        if (entity.spec) {
            if (entity.spec.type) backstageSuggestions.types.add(entity.spec.type);
            if (entity.spec.lifecycle) backstageSuggestions.lifecycles.add(entity.spec.lifecycle);
        }
    }
}

async function promptForAuthMethod(): Promise<string | undefined> {
    const options = ['Basic Auth', 'Bearer Token', 'No Auth'];
    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select an authentication method'
    });

    switch (selected) {
        case 'Basic Auth':
            return 'basic';
        case 'Bearer Token':
            return 'bearer';
        case 'No Auth':
            return 'none';
        default:
            return undefined;
    }
}

async function updateAuthMethodSetting(authMethod: string) {
    await vscode.workspace.getConfiguration().update('backstageCatalogHelper.authMethod', authMethod, vscode.ConfigurationTarget.Global);
}

async function getCredentials(context: vscode.ExtensionContext): Promise<{ username: string, password: string } | undefined> {
    const secretStorage = context.secrets;
    
    let username = await secretStorage.get('backstage-username');
    let password = await secretStorage.get('backstage-password');

    if (!username || !password) {
        username = await vscode.window.showInputBox({ prompt: 'Enter your Backstage username' });
        password = await vscode.window.showInputBox({ prompt: 'Enter your Backstage password', password: true });

        if (username && password) {
            await secretStorage.store('backstage-username', username);
            await secretStorage.store('backstage-password', password);
        } else {
            return undefined;
        }
    }

    return { username, password };
}

async function getToken(context: vscode.ExtensionContext): Promise<string | undefined> {
    const secretStorage = context.secrets;
    
    let token = await secretStorage.get('backstage-token');

    if (!token) {
        token = await vscode.window.showInputBox({ prompt: 'Enter your Backstage API token' });

        if (token) {
            await secretStorage.store('backstage-token', token);
        } else {
            return undefined;
        }
    }

    return token;
}

async function clearStoredCredentials(context: vscode.ExtensionContext, authMethod: string) {
    const secretStorage = context.secrets;
    if (authMethod === 'basic') {
        await secretStorage.delete('backstage-username');
        await secretStorage.delete('backstage-password');
    } else if (authMethod === 'bearer') {
        await secretStorage.delete('backstage-token');
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
                        case "api":
                          return provideFilteredMapSuggestions(backstageSuggestions.apis, "API", partialValue);
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