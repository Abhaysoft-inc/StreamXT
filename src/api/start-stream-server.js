import { exec } from 'child_process';

export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

    const { streamKey } = req.body;
    if (!streamKey) return res.status(400).json({ error: 'Stream key is required' });

    const containerName = `stream-container-${Date.now()}`;

    const command = `
    docker run -d \
      --name ${containerName} \
      -e STREAM_KEY=${streamKey} \
      -p 3001 \
      streamingserver
  `;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('Docker error:', stderr);
            return res.status(500).json({ error: 'Failed to start streaming container' });
        }

        console.log('Docker container started:', stdout.trim());
        return res.status(200).json({ message: 'Container started', containerId: stdout.trim() });
    });
}
