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