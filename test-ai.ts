import { AIOrchestrator } from './src/services/AIOrchestrator';
import { files } from './src/files';

async function test() {
  console.log('Testing AIOrchestrator...');
  // Test navbar command
  const result = await AIOrchestrator.parseUserCommand('add a navbar', files);
  if (result) {
    console.log('Success: AIOrchestrator returned a file tree.');
    // Check if App.tsx is modified
    const srcNode = result['src'];
    if (srcNode && 'directory' in srcNode) {
        const appNode = srcNode.directory['App.tsx'];
        if (appNode && 'file' in appNode) {
            const content = appNode.file.contents;
            if (typeof content === 'string' && content.includes('function Navbar')) {
                console.log('Success: App.tsx contains Navbar component.');
            } else {
                console.log('Failure: App.tsx does not contain Navbar component.');
                console.log('Content:', content);
            }
        }
    }
  } else {
    console.log('Failure: AIOrchestrator returned null.');
  }
}

test().catch(console.error);
