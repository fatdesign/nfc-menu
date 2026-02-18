// ============================================
// SHAKER ADMIN - CONFIGURATION
// ============================================
// ⚠️ WICHTIG: Das GitHub-Repository muss PRIVAT sein!
// Diese Datei enthält das Admin-Passwort und den GitHub-Token.
// Stelle sicher, dass das Repo auf "Private" gestellt ist,
// bevor du diese Datei committst.
//
// HOW TO SET UP:
// 1. GitHub Repo auf "Private" stellen (Settings → Danger Zone → Change visibility)
// 2. GitHub Token erstellen: github.com/settings/personal-access-tokens/new
//    → Permission: Contents: Read and Write
// 3. Werte unten ausfüllen, committen und pushen

const ADMIN_CONFIG = {
    // The password the restaurant owner uses to log in
    password: "shaker2024",

    // Your GitHub username
    githubOwner: "fatdesign",

    // The name of the repository (e.g. "shaker-menu")
    githubRepo: "shaker-menu",

    // The Personal Access Token (PAT) from GitHub
    githubToken: "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",

    // The path to the menu file in the repo
    menuFilePath: "menu.json"
};
