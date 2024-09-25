# Backstage Catalog Helper

## Overview

Backstage Catalog Helper is a Visual Studio Code extension that enhances your experience when working with Backstage catalog YAML files. It provides intelligent autocomplete suggestions for various Backstage entity fields, making it easier and faster to create and edit catalog-info.yaml files.

## Features

- Autocomplete suggestions for:
  - Systems
  - Groups (owners)
  - Components
  - Resources
  - Kinds
  - Types
  - Lifecycles
  - APIs
- Partial matching: Start typing and get filtered suggestions
- Description display: See entity descriptions in the autocomplete suggestions

## Installation

1. Open Visual Studio Code
2. Go to the Extensions view (Ctrl+Shift+X or Cmd+Shift+X on macOS)
3. Search for "Backstage Catalog Helper"
4. Click Install

Alternatively, you can install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=vatess.backstage-catalog-helper).

## Configuration

Before using the extension, you need to set up your Backstage API URL:

1. Open VS Code settings (File > Preferences > Settings)
2. Search for "Backstage Catalog Helper"
3. Enter your Backstage API URL in the "Backstage Catalog Helper: Base Url" field

## Authentication

The VS Code extension supports authentication when fetching entities from Backstage. Two authentication methods are supported:

- **Bearer Token Authentication**
- **Basic Authentication**

### Bearer Token Authentication

To use bearer token authentication, configure the following:

1. Set the authentication method to **Bearer Token** in your VS Code settings:
   - Open VS Code `Settings` (`File` > `Preferences` > `Settings`).
   - Search for `backstageCatalogHelper.authMethod`.
   - Choose `Bearer Token` from the dropdown menu.

2. The extension will prompt you to enter your Backstage API token the first time it attempts to fetch entities.

3. Configure your Backstage server to support bearer token authentication. Add a static token to the `app-config.production.yaml` file as follows:

    ```yaml
    backend:
      auth:
        externalAccess:
          - type: static
            options:
              token: ${VS_CODE_TOKEN}
              subject: vs-code-extension
            accessRestrictions:
              - plugin: catalog
    ```

    Replace `${VS_CODE_TOKEN}` with your actual token value. Refer to the [Backstage documentation](https://backstage.io/docs/auth/service-to-service-auth#static-tokens) for more details on static token setup.

### Basic Authentication

Basic authentication allows the use of a username and password for authentication. To use basic authentication:

1. Set the authentication method to **Basic Auth** in your VS Code settings:
   - Open VS Code `Settings` (`File` > `Preferences` > `Settings`).
   - Search for `backstageCatalogHelper.authMethod`.
   - Choose `Basic Auth` from the dropdown menu.

2. You will be prompted to enter your Backstage username and password the first time the extension attempts to fetch entities. These credentials are securely stored in VS Code's secret storage.

### Changing Authentication Methods

You can switch between the authentication methods at any time:

- Open the VS Code `Settings` and change the value of `backstageCatalogHelper.authMethod` to either `Basic Auth` or `Bearer Token`.
- The extension will prompt you to provide the necessary credentials for the new authentication method on the next entity fetch attempt.


## Usage

1. Open a `catalog-info.yaml` file in VS Code
2. Run the command "Fetch Backstage Entities" from the Command Palette (Ctrl+Shift+P or Cmd+Shift+P on macOS)
3. Start typing any of the following fields in your YAML file:
   - `system:`
   - `owner:`
   - `kind:`
   - `type:`
   - `lifecycle:`
   - `component:`
   - `resource:`
   - `api:`
4. The extension will provide autocomplete suggestions based on your Backstage catalog
5. You can also start typing the entity name after the colon (e.g., `owner: tea`) to get filtered suggestions

## Example

```yaml
apiVersion: backstage.io/v1alpha1
kind: Com  # Start typing here and get suggestions
metadata:
  name: example-component
  description: An example component
spec:
  type: ser  # Start typing here and get suggestions
  lifecycle: pr  # Start typing here and get suggestions
  owner: tea  # Start typing here and get suggestions
  system: pub  # Start typing here and get suggestions
  api: pub  # Start typing here and get suggestions
```

## Troubleshooting

If you're not seeing any suggestions:
1. Ensure you've set the correct Backstage API URL in the extension settings
2. Run the "Fetch Backstage Entities" command to refresh the entity data
3. Make sure your YAML file is recognized as a Backstage catalog file (it should typically be named `catalog-info.yaml`)

## Contributing

We welcome contributions to improve the Backstage Catalog Helper extension! Please feel free to submit issues or pull requests on our [GitHub repository](https://github.com/vateseeb/backstage-vscode-extension).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have any questions, please file an issue on our [GitHub issue tracker](https://github.com/vateseeb/backstage-vscode-extension/issues).

---

Happy cataloging with Backstage!