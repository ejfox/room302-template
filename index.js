#!/usr/bin/env node

const inquirer = require('inquirer');
const shell = require('shelljs');
const fs = require('fs');

async function main() {
  // Check Node.js version
  const nodeVersion = shell.exec('node -v', {silent:true}).stdout;
  const versionNumber = parseFloat(nodeVersion.replace('v', ''));
  if (versionNumber < 18.0) {
    shell.echo(`Error: Node.js version is not correct. Expected version above 18.0.0 but got ${nodeVersion}`);
    shell.echo('If you have nvm installed, you can do this with the command:');
    shell.echo('nvm use 18.17.1');
    shell.exit(1);
  }

  // Check if Supabase CLI is installed
  if (!shell.which('supabase')) {
    shell.echo('Error: Supabase CLI not found. Please install it first.');
    shell.echo('You can install it with the command:');
    shell.echo('npm install -g supabase');
    shell.exit(1);
  }

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: '🚀 What is the name of the project?',
      default: 'my-nuxt-project',
    },
    {
      type: 'confirm',
      name: 'initSupabase',
      message: '🚀 Do you want to initialize a Supabase project?',
      default: false,
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
  ]);

  const { projectName, initSupabase, useOpenAi, useNuxtUi, useNetlify, useGithubForEnv } = answers;

  // Initialize a Supabase project if user wants to
  if (initSupabase) {
      // Check if Docker is installed
    if (!shell.which('docker')) {
      shell.echo('Error: Docker not found. Please install it first.');
      shell.echo('You can install it with the command:');
      shell.echo('https://docs.docker.com/get-docker/');
      // shell.exit(1);
      return
    }
    if (shell.exec('supabase init').code !== 0) {
      shell.echo('Error: Supabase init failed');
      shell.exit(1);
    }
  }

  // Check if Netlify CLI is installed
  if (!shell.which('netlify')) {
    shell.echo('Error: Netlify CLI not found. Please install it first.');
    shell.echo('You can install it with the command:');
    shell.echo('npm install -g netlify-cli');
    // explain they will have to auth with the Netlify CLI
    shell.echo('You will also need to authenticate with Netlify using the command:');
    shell.echo('netlify login');
    shell.exit(1);
  }

  // Clone the template repo and log the output
  shell.echo('Cloning the template repo...');
  const cloneOutput = shell.exec(`git clone https://github.com/ejfox/nuxt-template-2023 ${projectName}`, {silent:false});
  if (cloneOutput.code !== 0) {
    shell.echo('Error: Git clone failed');
    shell.exit(1);
  }

  // Change directory to the new project
  shell.cd(projectName);

  // Delete useOpenAi.js if user does not want to use OpenAI
  if (!useOpenAi) {
    fs.unlinkSync('./composables/useOpenAi.js');
  }

  // Update package.json with the project name
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  packageJson.name = projectName;
  if (!useNuxtUi) {
    const index = packageJson.dependencies['@nuxt/ui'];
    if (index > -1) {
      packageJson.dependencies.splice(index, 1);
    }
  }
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

  // Update nuxt.config.ts with the selected modules
  const nuxtConfig = fs.readFileSync('nuxt.config.ts', 'utf8');
  let newNuxtConfig = nuxtConfig;
  if (!useNuxtUi) {
    newNuxtConfig = newNuxtConfig.replace("'@nuxt/ui',", "");
  }

  fs.writeFileSync('nuxt.config.ts', newNuxtConfig);

  // Install dependencies
  if (shell.exec('npm install').code !== 0) {
    shell.echo('Error: npm install failed');
    shell.exit(1);
  }

  // Set up Netlify deployment if user wants to use Netlify
  if (useNetlify) {
    // Initialize a new Netlify site
    if (shell.exec('netlify init').code !== 0) {
      shell.echo('Error: Netlify init failed');
      shell.exit(1);
    }

    // Link the local repo to the Netlify site
    if (shell.exec('netlify link').code !== 0) {
      shell.echo('Error: Netlify link failed');
      shell.exit(1);
    }

    // Set up continuous deployment
    if (shell.exec('netlify build').code !== 0) {
      shell.echo('Error: Netlify build failed');
      shell.exit(1);
    }
  }

  if (useGithubForEnv) {
    // Copy .env-example to .env before we can read/write it
    if (shell.cp('.env-example', '.env').code !== 0) {
      shell.echo('Error: Failed to copy .env-example to .env');
      shell.exit(1);
    }
    // Set up the .env based on the github organization secrets
    if (shell.exec('gh secret list').code !== 0) {
      shell.echo('Error: Failed to fetch GitHub secrets');
      shell.exit(1);
    }
    // Assuming the secrets are named as per the keys in .env file
    const envKeys = fs.readFileSync('.env', 'utf8').split('\n').map(line => line.split('=')[0]);
    envKeys.forEach(key => {
      if (shell.exec(`gh secret view ${key} --json`).code !== 0) {
        shell.echo(`Error: Failed to fetch secret ${key}`);
        shell.exit(1);
      } else {
        const secretValue = JSON.parse(shell.exec(`gh secret view ${key} --json`).stdout).namedValue.secret.value;
        fs.appendFileSync('.env', `${key}=${secretValue}\n`);
      }
    });
  }

  // Open the cloned repo in the code editor
  if (shell.exec('code .').code !== 0) {
    shell.echo('Error: Tried and failed to open the repo in VSCode');
    shell.exit(1);
  }
  
}

main();
