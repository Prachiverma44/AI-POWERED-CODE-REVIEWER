import * as vscode from "vscode";
import { runAgent } from "./agent.js";

export function activate(context) {
  const reviewCommand = vscode.commands.registerCommand(
    "aiCodeReviewer.reviewProject",
    async () => {
      const root = vscode.workspace.workspaceFolders?.[0];
      if (!root) {
        vscode.window.showErrorMessage("Please open a folder first.");
        return;
      }

      const config = vscode.workspace.getConfiguration();
      let apiKey = config.get("aiCodeReviewer.apiKey");

      // ✅ Prompt for API key if missing or empty
      if (!apiKey || apiKey.trim() === "") {
        apiKey = await vscode.window.showInputBox({
          prompt: "Enter your Gemini API Key",
          password: true,
          ignoreFocusOut: true
        });

        if (!apiKey || apiKey.trim() === "") {
          vscode.window.showErrorMessage(
            "API key is required to run AI Code Reviewer."
          );
          return;
        }

        apiKey = apiKey.trim();

        await config.update(
          "aiCodeReviewer.apiKey",
          apiKey,
          vscode.ConfigurationTarget.Global
        );
      }

      // Confirm before modifying files
      const confirm = await vscode.window.showWarningMessage(
        "This will analyze and MODIFY project files. Continue?",
        { modal: true },
        "Yes"
      );

      if (confirm !== "Yes") return;

     // ✅ Create Webview panel
    const panel = vscode.window.createWebviewPanel(
      "aiCodeReviewer",
      "🤖 AI Code Reviewer",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    // Initial HTML
    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial; padding: 16px;">
        <h2>🤖 AI Code Reviewer</h2>
        <div id="content"></div>
        <script>
          window.addEventListener("message", event => {
            const container = document.getElementById("content");
            const div = document.createElement("div");
            div.style.marginBottom = "8px";
            div.innerHTML = event.data;
            container.appendChild(div);
            window.scrollTo(0, document.body.scrollHeight);
          });
        </script>
      </body>
      </html>
    `;

    // Pass messages to Webview
    await runAgent(root.uri.fsPath, apiKey, html => {
      panel.webview.postMessage(html);
    });

    }
  );

  // Optional: command to change API key anytime
  const changeKeyCommand = vscode.commands.registerCommand(
    "aiCodeReviewer.changeApiKey",
    async () => {
      const config = vscode.workspace.getConfiguration();
      let newKey = await vscode.window.showInputBox({
        prompt: "Enter your new Gemini API Key",
        password: true,
        ignoreFocusOut: true
      });

      if (!newKey || newKey.trim() === "") {
        vscode.window.showErrorMessage("API key cannot be empty.");
        return;
      }

      newKey = newKey.trim();
      await config.update(
        "aiCodeReviewer.apiKey",
        newKey,
        vscode.ConfigurationTarget.Global
      );

      vscode.window.showInformationMessage("Gemini API Key updated successfully!");
    }
  );

  context.subscriptions.push(reviewCommand, changeKeyCommand);
}

export function deactivate() {}
