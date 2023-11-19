#!/usr/bin/env node

// Importing required modules
const inquirer = require('inquirer'); // For interactive command line user interfaces
const shell = require('shelljs'); // For executing shell commands

const fs = require('fs'); // For file system operations

// Main function
async function main() {
  // Check Node.js version
  // Execute the command to get Node.js version
  const nodeVersion = shell.exec('node -v', {silent:true}).stdout;
  // Parse the version number from the version string
  const versionNumber = parseFloat(nodeVersion.replace('v', ''));
  // Check if the version number is less than 18.0
  if (versionNumber < 18.0) {
    // If it is, print an error message and continue
    shell.echo(`🚨 Oops! Your Node.js version is not correct. We expected a version above 18.0.0 but got ${nodeVersion} 🙀`);
    shell.echo('👩‍🔧 If you have nvm installed, you can fix this with the command:');
    shell.echo('nvm use 18.17.1 🚀');
  }

  // Check if Supabase CLI is installed
  // If the 'supabase' command is not found, print an error message and continue
  if (!shell.which('supabase')) {
    shell.echo('🚨 Oops! Supabase CLI not found. Please install it first. 🛠️');
    shell.echo('👩‍🔧 You can install it with the command:');
    shell.echo('npm install -g supabase 🚀');
  }

  // Check if GitHub CLI is installed
  // If the 'gh' command is not found, print an error message and continue
  if (!shell.which('gh')) {
    shell.echo('🚨 Oops! GitHub CLI not found. Please install it first. 🛠️');
    shell.echo('👩‍🔧 You can install it with the command:');
    shell.echo('brew install gh 🚀');
  }

  // Prompt the user for input
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: '🚀 What is the name of the project?',
      default: 'my-nuxt-project',
    },    
    {
      type: 'confirm',
      name: 'useOpenAi',
      message: '🤖 Do you want to use OpenAI?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'useNuxtUi',
      message: '🎨 Do you want to use @nuxt/ui?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'useNuxtContent',
      message: '📚 Do you want to use Nuxt Content?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'initSupabase',
      message: '🚀 Do you want to initialize a Supabase project?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'useNetlify',
      message: '☁️ Do you want to set up a Netlify deployment after cloning?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'useGithubForEnv',
      message: '🔒 Do you want to set up your .env with your GitHub organization secrets?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'isRepoPublic',
      message: '🚀 Do you want to make the GitHub repository public?',
      default: true,
    },
    // {
    //   type: 'list',
    //   name: 'license',
    //   message: '📝 Please choose the license for your project:',
    //   choices: ['mit', 'copyright', 'unlicense', 'ecl-2.0', 'CC-BY-4.0', 'proprietary'],
    //   default: 'mit',
    // },
  ]);

  // Destructure the answers object to get the individual answers
  const { projectName, initSupabase, useOpenAi, useNuxtContent, useNuxtUi, useNetlify, useGithubForEnv, isRepoPublic, license } = answers;

  // Initialize a Supabase project if user wants to
  if (initSupabase) {
      // Check if Docker is installed
    if (!shell.which('docker')) {
      shell.echo('🚨 Oops! Docker not found. Please install it first. 🛠️');
      shell.echo('👩‍🔧 You can install it with the command:');
      shell.echo('https://docs.docker.com/get-docker/ 🚀');
      // shell.exit(1);
      return
    }
    // If Docker is installed, initialize a Supabase project
    if (shell.exec('supabase init --with-vscode-workspace').code !== 0) {
      shell.echo('🚨 Oops! Supabase init failed 😿');
    }
  }

  // Clone the template repo and log the output
  shell.echo('🚀 Let\'s clone the template repo... 🎉');
  // Execute the git clone command
  const cloneOutput = shell.exec(`git clone https://github.com/ejfox/nuxt-template-2023 ${projectName}`, {silent:true});
  // If the git clone command fails, print an error message and exit
  if (cloneOutput.code !== 0) {
    shell.echo('🚨 Oops! Git clone failed 😿');
    process.exit(1);
  }
  // If the git clone command succeeds, print a success message
  shell.echo('🎉 Hooray! Successfully cloned the template repo 🚀');

  // Change directory to the new project
  shell.cd(projectName);

  // Delete useOpenAi.js if user does not want to use OpenAI
  if (!useOpenAi) {
    fs.unlinkSync('./composables/useOpenAi.js');
  }

  // Update package.json with the project name
  // Read the package.json file
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  // Update the name property
  packageJson.name = projectName;
  // If the user does not want to use @nuxt/ui, remove it from the dependencies
  if (!useNuxtUi) {
    delete packageJson.dependencies['@nuxt/ui'];
  }
  // Write the updated package.json back to the file
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

  // Update nuxt.config.ts with the selected modules
  // Read the nuxt.config.ts file
  const nuxtConfig = fs.readFileSync('nuxt.config.ts', 'utf8');
  // Make a copy of the nuxt.config.ts content
  let newNuxtConfig = nuxtConfig;
  // If the user does not want to use @nuxt/ui, remove it from the modules
  if (!useNuxtUi) {
    newNuxtConfig = newNuxtConfig.replace("'@nuxt/ui',", "");
  }

  // If the user does not want to use Nuxt Content, remove it from the modules and package.json
  if (!useNuxtContent) {
    newNuxtConfig = newNuxtConfig.replace("'@nuxt/content',", "");
    try {
      newNuxtConfig = newNuxtConfig.replace(/content: { documentDriven: true },/g, "");
    } catch (error) {
      console.error('An error occurred while removing content config from nuxt.config.ts file:', error);
    }
    delete packageJson.dependencies['@nuxt/content'];
    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
    // Remove the /content/ folder and any Prose*.vue components in the /components/ folder
    if (shell.exec('rm -rf ./content').code !== 0) {
      shell.echo('🚨 Oops! Failed to remove /content/ folder 😿');
    }
    if (shell.exec('rm ./components/Prose*.vue').code !== 0) {
      shell.echo('🚨 Oops! Failed to remove Nuxt Content Prose*.vue components 😿');
    }
  }


  // Write the updated nuxt.config.ts back to the file
  fs.writeFileSync('nuxt.config.ts', newNuxtConfig);

  // remove existing git repo
  if (shell.exec('rm -rf .git').code !== 0) {
    shell.echo('🚨 Oops! Failed to remove existing git repo 😿');
  }

  if (shell.exec('git init').code !== 0) {
    shell.echo('🚨 Oops! Git init failed 😿');
  }

  // Check that we have a git repo
  const repoVisibility = isRepoPublic ? 'public' : 'private';
  

  // Create a new GitHub repository from the current directory
  if (shell.exec(`gh repo create room302studio/${projectName} --${repoVisibility} --source=${shell.pwd()}`).code !== 0) {
    shell.echo('🚨 Oops! Failed to create GitHub repository 😿');
  }


  // Commit the initilization and push
  if (shell.exec('git add .').code !== 0) {
    shell.echo('🚨 Oops! Git add failed 😿');
  }

  if (shell.exec(`git commit -m "feat: begin project 🪴"`).code !== 0) {
    shell.echo('🚨 Oops! Git commit failed 😿');
  }

  if (shell.exec('git push -u origin main').code !== 0) {
    shell.echo('🚨 Oops! Git push failed 😿');
  }

  // Set up Netlify deployment if user wants to use Netlify
  if (useNetlify) {
    // Initialize a new Netlify site
    if (shell.exec(`netlify init`, { stdio: 'inherit' }).code !== 0) {
      shell.echo('🚨 Oops! Netlify site creation failed 😿');
    }

    // Set up continuous deployment
    if (shell.exec('netlify build').code !== 0) {
      shell.echo('🚨 Oops! Netlify build failed 😿');
    }
  }

  if (useGithubForEnv) {
    // Copy .env-example to .env before we can read/write it
    if (shell.cp('.env-example', '.env').code !== 0) {
      shell.echo('🚨 Oops! Failed to copy .env-example to .env 😿');
    }
    // Set up the .env based on the github organization secrets
    if (shell.exec('gh secret list').code !== 0) {
      shell.echo('🚨 Oops! Failed to fetch GitHub secrets 😿');
    }
    // Assuming the secrets are named as per the keys in .env file
    const envKeys = fs.readFileSync('.env', 'utf8').split('\n').map(line => line.split('=')[0]);
    envKeys.forEach(key => {
      const secretViewResult = shell.exec(`gh secret view ${key} --json`, { silent: true });
      if (secretViewResult.code !== 0) {
        shell.echo(`🚨 Oops! .env secret ${key} was not found in GitHub org secrets`);
      } else {
        let secretValue;
        try {
          secretValue = JSON.parse(secretViewResult.stdout).namedValue.secret.value;
        } catch (error) {
          shell.echo(`🚨 Oops! Failed to parse secret ${key} 😿`);
        }
        fs.appendFileSync('.env', `${key}=${secretValue}\n`);
      }
    });
  }

  // Open the cloned repo in the code editor
  if (shell.exec('code .').code !== 0) {
    shell.echo('🚨 Oops! Tried and failed to open the repo in VSCode 😿');
  }

  // Install dependencies
  if (shell.exec('yarn install').code !== 0) {
    shell.echo('🚨 Oops! npm install failed 😿');
  }
  
}

// Call the main function
main();


