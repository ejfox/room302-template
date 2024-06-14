#!/usr/bin/env node

// Importing required modules
const inquirer = require("inquirer");
const shell = require("shelljs");
const fs = require("fs");

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
        type: "confirm",
        name: "useNuxtUi",
        message: "🎨 Do you want to use @nuxt/ui?",
        default: true,
      },
      {
        type: "confirm",
        name: "useNuxtContent",
        message: "📚 Do you want to use @nuxt/content?",
        default: true,
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
    const cloneOutput = shell.exec(
      `gh repo clone room302studio/nuxt-template ${projectName}`,
      { silent: true }
    );
    if (cloneOutput.code !== 0) {
      shell.echo("🚨 Oops! Git clone failed 😿");
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
    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    packageJson.name = projectName;
    packageJson.license = license;
    if (!useNuxtUi) {
      delete packageJson.dependencies["@nuxt/ui"];
    }
    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
  } catch (error) {
    shell.echo("🚨 Error occurred while updating package.json:", error);
  }
}

// Function to update nuxt.config.ts
async function updateNuxtConfig(useNuxtUi, useNuxtContent) {
  try {
    let nuxtConfig = fs.readFileSync("nuxt.config.ts", "utf8");
    if (!useNuxtUi) {
      nuxtConfig = nuxtConfig.replace("'@nuxt/ui',", "");
    }
    if (!useNuxtContent) {
      nuxtConfig = nuxtConfig.replace("'@nuxt/content',", "");
      nuxtConfig = nuxtConfig.replace(
        /content: { documentDriven: true },/g,
        ""
      );
      const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
      delete packageJson.dependencies["@nuxt/content"];
      fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
      if (shell.exec("rm -rf ./content").code !== 0) {
        shell.echo("🚨 Oops! Failed to remove /content/ folder 😿");
      }
      if (shell.exec("rm ./components/content/Prose*.vue").code !== 0) {
        shell.echo(
          "🚨 Oops! Failed to remove Nuxt Content Prose*.vue components 😿"
        );
      }
    }
    fs.writeFileSync("nuxt.config.ts", nuxtConfig);
  } catch (error) {
    shell.echo("🚨 Error occurred while updating nuxt.config.ts:", error);
  }
}

// Function to initialize a new git repo
async function initGitRepo() {
  try {
    if (shell.exec("rm -rf .git").code !== 0) {
      shell.echo("🚨 Oops! Failed to remove existing git repo 😿");
    }
    if (shell.exec("git init").code !== 0) {
      shell.echo("🚨 Oops! Git init failed 😿");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while initializing a new git repo:", error);
  }
}

// Function to create a new GitHub repository
async function createGitHubRepo(
  projectName,
  isRepoPublic,
  githubOrg,
  customGithubOrg
) {
  try {
    const repoVisibility = isRepoPublic ? "public" : "private";
    let githubOrgName = "";
    if (githubOrg === "personal") {
      githubOrgName = "";
    } else if (githubOrg === "room302studio") {
      githubOrgName = "room302studio/";
    } else {
      githubOrgName = `${customGithubOrg}/`;
    }
    if (
      shell.exec(
        `gh repo create ${githubOrgName}${projectName} --${repoVisibility} --source=${shell.pwd()}`
      ).code !== 0
    ) {
      shell.echo("🚨 Oops! Failed to create GitHub repository 😿");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while creating GitHub repository:", error);
  }
}

// Function to commit and push changes
async function commitAndPush(autoCommitPush) {
  try {
    if (autoCommitPush) {
      if (shell.exec("git add .").code !== 0) {
        shell.echo("🚨 Oops! Git add failed 😿");
      }
      if (shell.exec(`git commit -m "feat: begin project 🪴"`).code !== 0) {
        shell.echo("🚨 Oops! Git commit failed 😿");
      }
      if (shell.exec("git push -u origin main").code !== 0) {
        shell.echo("🚨 Oops! Git push failed 😿");
      }
    }
  } catch (error) {
    shell.echo(
      "🚨 Error occurred while committing and pushing changes:",
      error
    );
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
    if (shell.exec("yarn install").code !== 0) {
      shell.echo("🚨 Oops! yarn install failed 😿");
    }
  } catch (error) {
    shell.echo("🚨 Error occurred while installing dependencies:", error);
  }
}

// Main function
async function main() {
  await checkNodeVersion();
  await checkSupabaseCLI();
  await checkGitHubCLI();

  const answers = await promptUser();
  const {
    projectName,
    useNuxtContent,
    useNuxtUi,
    isRepoPublic,
    license,
    githubOrg,
    customGithubOrg,
    autoCommitPush,
  } = answers;

  await cloneTemplateRepo(projectName);

  shell.cd(projectName);

  await updateNuxtConfig(useNuxtUi, useNuxtContent);

  await initGitRepo();
  await updatePackageJson(projectName, license, useNuxtUi);
  await createGitHubRepo(projectName, isRepoPublic, githubOrg, customGithubOrg);

  await commitAndPush(autoCommitPush);

  await openInEditor();
  await installDependencies();
}

// Call the main function
main();

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
