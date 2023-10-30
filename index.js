#!/usr/bin/env node

const inquirer = require('inquirer');
const shell = require('shelljs');

async function main() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is the name of the project?',
      default: 'my-nuxt-project',
    },
    // Add more prompts for other settings here
  ]);

  const { projectName } = answers;

  // Clone the template repo
  if (shell.exec(`git clone https://github.com/your-org/room302-template ${projectName}`).code !== 0) {
    shell.echo('Error: Git clone failed');
    shell.exit(1);
  }

  // Change directory to the new project
  shell.cd(projectName);

  // Install dependencies
  if (shell.exec('npm install').code !== 0) {
    shell.echo('Error: npm install failed');
    shell.exit(1);
  }

  // Perform any other setup tasks here
}

main();