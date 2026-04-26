import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { displayImage } from '../utils/imageRenderer.js';

const originalTermProgram = process.env.TERM_PROGRAM;
const originalCodespaces = process.env.CODESPACES;

describe('imageRenderer', () => {
  beforeEach(() => {
    delete process.env.TERM_PROGRAM;
    delete process.env.CODESPACES;
  });

  afterEach(() => {
    process.env.TERM_PROGRAM = originalTermProgram;
    process.env.CODESPACES = originalCodespaces;
  });

  it('returns null when running in VS Code terminal', async () => {
    process.env.TERM_PROGRAM = 'vscode';
    const result = await displayImage('https://example.com/image.png');
    expect(result).toBeNull();
  });

  it('returns null when running in Codespaces', async () => {
    process.env.CODESPACES = 'true';
    const result = await displayImage('https://example.com/image.png');
    expect(result).toBeNull();
  });
});