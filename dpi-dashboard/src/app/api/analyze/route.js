import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const execFileAsync = promisify(execFile);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Write file to temp dir
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create unique temp file paths
    const uniqueId = Math.random().toString(36).substring(2, 15);
    const tempInput = path.join(os.tmpdir(), `input_${uniqueId}.pcap`);
    const tempOutput = path.join(os.tmpdir(), `output_${uniqueId}.pcap`);

    await fs.writeFile(tempInput, buffer);

    // Determine correct engine binary based on OS
    const isWindows = os.platform() === 'win32';
    // Engine binary path assumes Next.js runs from dpi-dashboard directory and binary is in parent dir
    const enginePath = path.resolve(process.cwd(), '..', isWindows ? 'dpi_engine.exe' : 'dpi_engine');

    try {
      // Execute DPI Engine with JSON flag
      const { stdout, stderr } = await execFileAsync(enginePath, [tempInput, tempOutput, '--json']);
      
      // Extract JSON part from stdout (in case of debug prints like "Opened PCAP...")
      const jsonStartIndex = stdout.indexOf('{');
      const jsonEndIndex = stdout.lastIndexOf('}');
      
      if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error("No JSON found in engine output");
      }
      
      const jsonStr = stdout.substring(jsonStartIndex, jsonEndIndex + 1);
      const result = JSON.parse(jsonStr);
      
      // Cleanup temp files (fire and forget)
      fs.unlink(tempInput).catch(() => {});
      fs.unlink(tempOutput).catch(() => {});

      return NextResponse.json(result);
    } catch (engineError) {
      console.error("Engine execution error:", engineError);
      
      // Cleanup on error
      fs.unlink(tempInput).catch(() => {});
      fs.unlink(tempOutput).catch(() => {});
      
      return NextResponse.json({ 
        error: 'Engine processing failed', 
        details: engineError.message,
        stdout: engineError.stdout,
        stderr: engineError.stderr
      }, { status: 500 });
    }

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
