import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const sourcePath = path.resolve(repoRoot, 'wiki', 'build-status.md');
const outputPath = path.resolve(frontendRoot, 'src', 'generated', 'backlogData.js');

const sourceText = await fs.readFile(sourcePath, 'utf8');
const todoMatch = sourceText.match(/^## To Do\s*([\s\S]*?)^## Completed/m);
const todoBlock = todoMatch?.[1] || '';
const lines = todoBlock.split(/\r?\n/);

const sections = [];
let currentSection = null;

for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    const sectionMatch = line.match(/^###\s+(P\d+)/);
    if (sectionMatch) {
        currentSection = {
            priority: sectionMatch[1],
            items: []
        };
        sections.push(currentSection);
        continue;
    }

    if (currentSection && line.startsWith('- ')) {
        currentSection.items.push(line.slice(2).trim());
    }
}

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(
    outputPath,
    `export const backlogData = ${JSON.stringify({ title: 'To Do', sections }, null, 2)};\n`,
    'utf8'
);
