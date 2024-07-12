import axios from 'axios';
import * as vscode from 'vscode';

interface BackstageEntity {
    kind: string;
    name: string;
    description: string;
}

let backstageEntities: BackstageEntity[] = [];
let backstageSystems: BackstageEntity[] = [];
let debug = false;

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.fetchBackstageEntities', async () => {
        const backstageBaseUrl = vscode.workspace.getConfiguration().get('backstageAutocomplete.baseUrl');
        debug = vscode.workspace.getConfiguration().get('backstageAutocomplete.debug') === true;
        if (!backstageBaseUrl) {
            vscode.window.showErrorMessage('Backstage base URL is not configured. Please set it in the settings.');
            return;
        }

        const apiUrl = `${backstageBaseUrl}/api`;

        try {
            backstageEntities = await fetchBackstageEntities(apiUrl);
            backstageSystems = backstageEntities.filter((entity, index, self) => entity.kind === 'System' && self.findIndex(e => e.name === entity.name) === index);
            provideSystemSuggestions(backstageSystems);
            vscode.window.showInformationMessage('Backstage entities fetched successfully!');
        } catch (error: unknown) {
            vscode.window.showErrorMessage('Failed to fetch Backstage entities: ' + (error as Error).message);
        }
    });

    context.subscriptions.push(disposable);
}

async function fetchBackstageEntities(apiUrl: string): Promise<BackstageEntity[]> {
    const response = await axios.get(`${apiUrl}/catalog/entities`);
    if (debug) {
        vscode.window.showTextDocument(vscode.Uri.parse('untitled:backstage-entities'), { viewColumn: vscode.ViewColumn.Beside }).then(editor => {
            editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(0, 0), JSON.stringify(response.data, null, 2));
            });
        });
    }
    return response.data.map((entity: any) => ({
        kind: entity.kind,
        name: entity.metadata.name,
        description: entity.metadata.description
    }));
}

function provideSystemSuggestions(entities: BackstageEntity[]) {
    vscode.languages.registerCompletionItemProvider(
        { scheme: 'file', language: 'yaml' },
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
                const linePrefix = document.lineAt(position).text.substr(0, position.character);
                if (!linePrefix.endsWith('system: ')) {
                    return undefined;
                }

                return entities
                    .map(entity => {
                        const completionItem = new vscode.CompletionItem(entity.name, vscode.CompletionItemKind.Value);
                        completionItem.detail = entity.description;
                        return completionItem;
                    });
            }
        }
    );
}

export function deactivate() {}