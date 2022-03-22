import { debounce } from "mighty-promise";
import * as vscode from "vscode";
import { extensionId } from "./config";
import { discoverAllFilesInWorkspace, discoverTestFromDoc } from "./discover";
import { isVitestEnv } from "./pure/isVitestEnv";
import { debugHandler, runHandler } from "./runHandler";
import { WEAKMAP_TEST_DATA, TestFile } from "./TestData";

export async function activate(context: vscode.ExtensionContext) {
  if (
    vscode.workspace.workspaceFolders == null ||
    vscode.workspace.workspaceFolders.length === 0 ||
    !(await isVitestEnv(vscode.workspace.workspaceFolders[0].uri.path))
  ) {
    return;
  }

  const ctrl = vscode.tests.createTestController(
    `${extensionId}`,
    "Vitest Test Provider"
  );

  ctrl.refreshHandler = async () => {
    await discoverAllFilesInWorkspace(ctrl);
  };

  ctrl.resolveHandler = async (item) => {
    if (!item) {
      await discoverAllFilesInWorkspace(ctrl);
    } else {
      const data = WEAKMAP_TEST_DATA.get(item);
      if (data instanceof TestFile) {
        await data.updateFromDisk(ctrl);
      }
    }
  };

  ctrl.createRunProfile(
    "Run Tests",
    vscode.TestRunProfileKind.Run,
    runHandler.bind(null, ctrl),
    true
  );

  ctrl.createRunProfile(
    "Debug Tests",
    vscode.TestRunProfileKind.Debug,
    debugHandler.bind(null, ctrl),
    true
  );

  vscode.window.visibleTextEditors.forEach((x) =>
    discoverTestFromDoc(ctrl, x.document)
  );

  context.subscriptions.push(
    ctrl,
    vscode.commands.registerCommand("vitest-explorer.configureTest", () => {
      vscode.window.showInformationMessage("Not implemented");
    }),
    vscode.workspace.onDidOpenTextDocument((e) => {
      discoverTestFromDoc(ctrl, e);
    }),
    vscode.workspace.onDidChangeTextDocument(
      debounce((e) => discoverTestFromDoc(ctrl, e.document), 1000)
    )
  );
}

export function deactivate() {}