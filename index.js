#!/usr/bin/env node

// Importing required modules
const inquirer = require("inquirer");
const shell = require("shelljs");
const fs = require("fs");

// Export all functions we want to test
module.exports = {
  checkNodeVersion,
  checkSupabaseCLI,
  checkGitHubCLI,
  promptUser,
  cloneTemplateRepo,
  updatePackageJson,
  setupTailwind,
  updateNuxtConfig,
  initGitRepo,
  createGitHubRepo,
  commitAndPush,
  openInEditor,
  installDependencies,
  main
};

// Function to check Node.js version
async function checkNodeVersion() {
  try {
    const nodeVersion = shell.exec("node -v", { silent: true }).stdout;
    const versionNumber = parseFloat(nodeVersion.replace("v", ""));
    if (versionNumber < 18.0) {
      shell.echo(
        `🚨 Oops! Your Node.js version is not correct. We expected a version above 18.0.0 but got ${nodeVersion} 🙀`
      );
      shell.echo(
        "👩‍🔧 If you have nvm installed, you can fix this with the command:"
      );
      shell.echo("nvm use 18.17.1 🚀");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while checking Node.js version:", error);
  }
}

// Function to check if Supabase CLI is installed
async function checkSupabaseCLI() {
  try {
    if (!shell.which("supabase")) {
      shell.echo(
        "🚨 Oops! Supabase CLI not found. Please install it first. 🛠️"
      );
      shell.echo("👩‍🔧 You can install it with the command:");
      shell.echo("npm install -g supabase 🚀");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while checking Supabase CLI:", error);
  }
}

// Function to check if GitHub CLI is installed
async function checkGitHubCLI() {
  try {
    if (!shell.which("gh")) {
      shell.echo("🚨 Oops! GitHub CLI not found. Please install it first. 🛠️");
      shell.echo("👩‍🔧 You can install it with the command:");
      shell.echo("brew install gh 🚀");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while checking GitHub CLI:", error);
  }
}

// Function to prompt user for input
async function promptUser() {
  try {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "🚀 What is the name of the project?",
        default: "my-nuxt-project",
      },
      {
        type: "list",
        name: "uiFramework",
        message: "🎨 Which UI framework would you like to use?",
        choices: [
          { name: "@nuxt/ui (recommended, includes Tailwind)", value: "nuxt-ui" },
          { name: "Tailwind CSS only (lightweight)", value: "tailwind" },
          { name: "None (bare Nuxt)", value: "none" },
        ],
        default: "nuxt-ui",
      },
      {
        type: "confirm",
        name: "isRepoPublic",
        message: "🚀 Do you want to make the GitHub repository public?",
        default: true,
      },
      {
        type: "list",
        name: "license",
        message: "📝 Please choose the license for your project:",
        choices: ["mit", "UNLICENSED", "ecl-2.0", "CC-BY-4.0", "proprietary"],
        default: "mit",
      },
      {
        type: "list",
        name: "githubOrg",
        message: "🏢 Choose the GitHub organization for the project:",
        choices: ["personal", "room302studio", "other"],
        default: "personal",
      },
      {
        type: "input",
        name: "customGithubOrg",
        message: "🏢 Enter the name of your GitHub organization:",
        when: (answers) => answers.githubOrg === "other",
      },
      {
        type: "confirm",
        name: "autoCommitPush",
        message: "🚀 Do you want to automatically commit and push the changes?",
        default: true,
      },
    ]);
    return answers;
  } catch (error) {
    shell.echo("🚨 Error occurred while prompting for user input:", error);
    process.exit(1);
  }
}

// Function to clone the template repo
async function cloneTemplateRepo(projectName) {
  try {
    shell.echo("🚀 Let's clone the template repo... 🎉");
    
    // First verify the template repo exists
    const repoCheck = shell.exec(
      'gh repo view room302studio/nuxt-template --json name,html_url',
      { silent: true }
    );
    
    if (repoCheck.code !== 0) {
      shell.echo("🚨 Template repository not accessible. Please check https://github.com/room302studio/nuxt-template");
      process.exit(1);
    }

    const cloneOutput = shell.exec(
      `gh repo clone room302studio/nuxt-template ${projectName}`,
      { silent: true }
    );
    
    if (cloneOutput.code !== 0) {
      shell.echo("🚨 Oops! Git clone failed 😿");
      process.exit(1);
    }

    // Verify essential files exist
    const essentialFiles = [
      'nuxt.config.ts',
      'package.json',
      'tailwind.config.js',
      'app.vue'
    ];

    shell.cd(projectName);
    const missingFiles = essentialFiles.filter(file => !fs.existsSync(file));

    if (missingFiles.length > 0) {
      shell.echo(`🚨 Template repository is missing essential files: ${missingFiles.join(', ')}`);
      process.exit(1);
    }

    shell.echo("🎉 Hooray! Successfully cloned the template repo 🚀");
  } catch (error) {
    shell.echo("🚨 Error occurred while cloning the template repo:", error);
    process.exit(1);
  }
}

// Function to update package.json
async function updatePackageJson(projectName, license, useNuxtUi) {
  try {
    shell.echo("📝 Updating package.json...");
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    packageJson.name = projectName;
    packageJson.license = license;
    if (!useNuxtUi) {
      delete packageJson.dependencies["@nuxt/ui"];
    }
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
    shell.echo("✅ Package.json updated successfully!");
  } catch (error) {
    shell.echo("🚨 Error occurred while updating package.json:", error);
  }
}

// Function to set up Tailwind CSS
async function setupTailwind() {
  try {
    shell.echo("🎨 Setting up Tailwind CSS...");
    
    // Install required dependencies
    if (shell.exec("yarn add -D tailwindcss postcss autoprefixer").code !== 0) {
      shell.echo("🚨 Failed to install Tailwind dependencies");
      return;
    }

    // Check for existing tailwind.config.js
    if (fs.existsSync("tailwind.config.js")) {
      // Modify existing config to remove @nuxt/ui specific settings
      let existingConfig = fs.readFileSync("tailwind.config.js", "utf8");
      existingConfig = existingConfig
        .replace(/@nuxt\/ui/g, '')  // Remove @nuxt/ui references
        .replace(/,\s*\n\s*\n/g, '\n'); // Clean up empty lines
      
      fs.writeFileSync("tailwind.config.js", existingConfig);
    } else {
      // Create new tailwind.config.js if it doesn't exist
      const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
      fs.writeFileSync("tailwind.config.js", tailwindConfig);
    }

    // Check for existing postcss.config.js
    if (!fs.existsSync("postcss.config.js")) {
      const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
      fs.writeFileSync("postcss.config.js", postcssConfig);
    }

    // Check for existing tailwind.css
    const tailwindCSSPath = "assets/css/tailwind.css";
    if (!fs.existsSync(tailwindCSSPath)) {
      if (!fs.existsSync("assets/css")) {
        shell.mkdir("-p", "assets/css");
      }
      
      const tailwindCSS = `@tailwind base;
@tailwind components;
@tailwind utilities;`;
      fs.writeFileSync(tailwindCSSPath, tailwindCSS);
    }

    // Update nuxt.config.ts to include Tailwind if not already included
    let nuxtConfig = fs.readFileSync("nuxt.config.ts", "utf8");
    if (!nuxtConfig.includes("assets/css/tailwind.css")) {
      nuxtConfig = nuxtConfig.replace(
        "export default defineNuxtConfig({",
        `export default defineNuxtConfig({
  css: ['~/assets/css/tailwind.css'],`
      );
      fs.writeFileSync("nuxt.config.ts", nuxtConfig);
    }

    shell.echo("✅ Tailwind CSS setup complete!");
  } catch (error) {
    shell.echo("🚨 Error occurred while setting up Tailwind:", error);
  }
}

// Function to update nuxt.config.ts
async function updateNuxtConfig(uiFramework) {
  try {
    shell.echo("🎨 Configuring UI framework...");
    let nuxtConfig = fs.readFileSync("nuxt.config.ts", "utf8");
    
    // Handle UI framework selection
    switch (uiFramework) {
      case 'none':
        shell.echo("🧹 Removing UI frameworks for a clean slate...");
        nuxtConfig = nuxtConfig.replace("'@nuxt/ui',", "");
        break;
      
      case 'tailwind':
        shell.echo("🎭 Setting up lightweight Tailwind configuration...");
        nuxtConfig = nuxtConfig.replace("'@nuxt/ui',", "");
        await setupTailwind();
        break;
      
      case 'nuxt-ui':
        shell.echo("✨ Keeping @nuxt/ui configuration...");
        break;
    }
    
    // Update package.json based on UI selection
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    if (uiFramework !== 'nuxt-ui') {
      delete packageJson.dependencies["@nuxt/ui"];
    }
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
    fs.writeFileSync("nuxt.config.ts", nuxtConfig);
    shell.echo("✅ UI framework configuration complete!");
  } catch (error) {
    shell.echo("🚨 Error occurred while updating nuxt.config.ts:", error);
  }
}

// Function to initialize a new git repo
async function initGitRepo() {
  try {
    shell.echo("🌱 Initializing fresh Git repository...");
    if (shell.exec("rm -rf .git").code !== 0) {
      shell.echo("🚨 Oops! Failed to remove existing git repo 😿");
    }
    if (shell.exec("git init").code !== 0) {
      shell.echo("🚨 Oops! Git init failed 😿");
    }
    shell.echo("✅ Git repository initialized!");
  } catch (error) {
    shell.echo("🚨 Error occurred while initializing a new git repo:", error);
  }
}

// Function to create a new GitHub repository
async function createGitHubRepo(projectName, isRepoPublic, githubOrg, customGithubOrg) {
  try {
    shell.echo("🏗️  Creating GitHub repository...");
    const repoVisibility = isRepoPublic ? "public" : "private";
    let githubOrgName = "";
    if (githubOrg === "personal") {
      shell.echo("🏠 Creating in your personal GitHub account...");
      githubOrgName = "";
    } else if (githubOrg === "room302studio") {
      shell.echo("🏢 Creating in Room302 Studio organization...");
      githubOrgName = "room302studio/";
    } else {
      shell.echo(`🏢 Creating in ${customGithubOrg} organization...`);
      githubOrgName = `${customGithubOrg}/`;
    }
    if (shell.exec(`gh repo create ${githubOrgName}${projectName} --${repoVisibility} --source=${shell.pwd()}`).code !== 0) {
      shell.echo("🚨 Oops! Failed to create GitHub repository 😿");
    } else {
      shell.echo("✅ GitHub repository created successfully!");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while creating GitHub repository:", error);
  }
}

// Function to commit and push changes
async function commitAndPush(autoCommitPush) {
  try {
    if (autoCommitPush) {
      shell.echo("🌿 Preparing initial commit...");
      if (shell.exec("git add .").code !== 0) {
        shell.echo("🚨 Oops! Git add failed 😿");
      }
      if (shell.exec(`git commit -m "feat: begin project 🪴"`).code !== 0) {
        shell.echo("🚨 Oops! Git commit failed 😿");
      }
      shell.echo("🚀 Pushing to GitHub...");
      if (shell.exec("git push -u origin main").code !== 0) {
        shell.echo("🚨 Oops! Git push failed 😿");
      } else {
        shell.echo("✅ Changes pushed to GitHub successfully!");
      }
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while committing and pushing changes:", error);
  }
}

// Function to open the cloned repo in the code editor
async function openInEditor() {
  try {
    if (shell.exec("code .").code !== 0) {
      shell.echo("🚨 Oops! Tried and failed to open the repo in VSCode 😿");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while opening the repo in VSCode:", error);
  }
}

// Function to install dependencies
async function installDependencies() {
  try {
    shell.echo("📦 Installing project dependencies...");
    if (shell.exec("yarn install").code !== 0) {
      shell.echo("🚨 Oops! yarn install failed 😿");
    } else {
      shell.echo("✅ Dependencies installed successfully!");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while installing dependencies:", error);
  }
}

// Main function
async function main() {
  shell.echo("🚀 Starting project setup...");
  await checkNodeVersion();
  await checkSupabaseCLI();
  await checkGitHubCLI();

  const answers = await promptUser();
  const {
    projectName,
    uiFramework,
    isRepoPublic,
    license,
    githubOrg,
    customGithubOrg,
    autoCommitPush,
  } = answers;

  shell.echo(`\n🎯 Creating project: ${projectName}\n`);
  await cloneTemplateRepo(projectName);

  shell.cd(projectName);
  shell.echo("📂 Setting up project structure...");

  await updateNuxtConfig(uiFramework);
  await updatePackageJson(projectName, license, uiFramework === 'nuxt-ui');
  await initGitRepo();
  await createGitHubRepo(projectName, isRepoPublic, githubOrg, customGithubOrg);
  await commitAndPush(autoCommitPush);
  await installDependencies();
  await openInEditor();

  shell.echo("\n🎉 All done! Your project is ready to go! 🚀\n");
  shell.echo("Next steps:");
  shell.echo("1. 👉 cd " + projectName);
  shell.echo("2. 🏃‍♂️ yarn dev");
  shell.echo("3. 🎨 Start building something amazing!\n");
}

// Move the main() call to only run when file is executed directly
if (require.main === module) {
  main();
}

/*
Instructions for adding a new step:

1. Define a new question in the `inquirer.prompt` array to gather the necessary input from the user.
2. Add a new property to the `answers` object destructuring to capture the user's input.
3. Implement the logic for the new step in a `try/catch` block so that any errors are caught and logged.
4. If the new step involves modifying files, make sure to update the relevant files (e.g., package.json, nuxt.config.ts) accordingly.
5. If the new step requires executing shell commands, use `shell.exec` and handle any potential errors.
6. Add appropriate error handling and logging for the new step.

Example: Adding a new step to create a README.md file

1. Add a new question to the `inquirer.prompt` array:
   {
     type: 'confirm',
     name: 'createReadme',
     message: '📝 Do you want to create a README.md file?',
     default: true,
   }

2. Add the new property to the `answers` object destructuring:
   const { ..., createReadme } = answers;

3. Implement the logic for creating the README.md file:
   try {
     if (createReadme) {
       fs.writeFileSync('README.md', `# ${projectName}\n\nThis is a README file for ${projectName}.`);
       shell.echo('📝 README.md file created successfully!');
     }
   } catch (error) {
     shell.echo('🚨 Error occurred while creating README.md file:', error);
   }

4. The new step is now added to the script!
*/
