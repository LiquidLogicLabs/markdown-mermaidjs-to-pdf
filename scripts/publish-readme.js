#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

class ReadmePublisher {
  constructor() {
    this.readmePath = path.join(__dirname, '..', 'README.md');
    this.dockerhubUsername = process.env.DOCKERHUB_USERNAME;
    this.dockerhubToken = process.env.DOCKERHUB_TOKEN;
    this.githubToken = process.env.GITHUB_TOKEN;
    this.repositoryOwner = process.env.GITHUB_REPOSITORY_OWNER || 'liquidlogiclabs';
    this.imageName = process.env.IMAGE_NAME_SHORT || 'markdown-mermaidjs-to-pdf';
  }

  async readReadme() {
    try {
      const readmeContent = await fs.promises.readFile(this.readmePath, 'utf8');
      return readmeContent;
    } catch (error) {
      console.error('Error reading README.md:', error.message);
      throw error;
    }
  }

  async makeRequest(url, options, data = null) {
    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            resolve({ status: res.statusCode, data: response });
          } catch (error) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async publishToDockerHub(readmeContent) {
    if (!this.dockerhubUsername || !this.dockerhubToken) {
      console.log('Skipping Docker Hub README publish - credentials not available');
      return;
    }
    
    if (process.env.PUBLISH_TO_DOCKERHUB !== 'true') {
      console.log('Skipping Docker Hub README publish - PUBLISH_TO_DOCKERHUB is not enabled');
      return;
    }

    console.log('Publishing README to Docker Hub...');

    const url = `https://hub.docker.com/v2/repositories/${this.dockerhubUsername}/${this.imageName}/`;
    const auth = Buffer.from(`${this.dockerhubUsername}:${this.dockerhubToken}`).toString('base64');

    const options = {
      method: 'PATCH',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GitHub-Actions-README-Publisher'
      }
    };

    const data = {
      full_description: readmeContent
    };

    try {
      const response = await this.makeRequest(url, options, data);
      if (response.status === 200) {
        console.log('✅ README published to Docker Hub successfully');
      } else {
        console.log(`⚠️ Docker Hub response: ${response.status} - ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error('❌ Error publishing to Docker Hub:', error.message);
    }
  }

  async publishToGitHubContainerRegistry(readmeContent) {
    if (!this.githubToken) {
      console.log('Skipping GitHub Container Registry README publish - token not available');
      return;
    }

    console.log('Publishing README to GitHub Container Registry...');

    const url = `https://api.github.com/user/packages/container/${this.imageName}`;
    
    const options = {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${this.githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GitHub-Actions-README-Publisher'
      }
    };

    const data = {
      description: readmeContent.substring(0, 1000) // GHCR has description length limits
    };

    try {
      const response = await this.makeRequest(url, options, data);
      if (response.status === 200) {
        console.log('✅ README published to GitHub Container Registry successfully');
      } else {
        console.log(`⚠️ GitHub Container Registry response: ${response.status} - ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.error('❌ Error publishing to GitHub Container Registry:', error.message);
    }
  }

  async publish() {
    try {
      console.log('📖 Reading README.md...');
      const readmeContent = await this.readReadme();
      console.log(`✅ README content loaded (${readmeContent.length} characters)`);

      // Publish to both registries
      await this.publishToDockerHub(readmeContent);
      await this.publishToGitHubContainerRegistry(readmeContent);

      console.log('🎉 README publishing completed!');
    } catch (error) {
      console.error('❌ Error publishing README:', error.message);
      process.exit(1);
    }
  }
}

// Run the publisher
const publisher = new ReadmePublisher();
publisher.publish(); 