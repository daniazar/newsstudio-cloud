import prompts from 'prompts';
import { execSync } from 'child_process';

async function main() {
  console.log('\n=============================================');
  console.log('🤖 Ruby NewsStudio Worker CLI Manager');
  console.log('=============================================\n');

  // 1. Check if Docker is running
  try {
    execSync('docker info', { stdio: 'ignore' });
  } catch (error) {
    console.error('❌ Error: Docker daemon is not running.');
    console.error('Please launch Docker Desktop and wait for it to be active before running this CLI.\n');
    process.exit(1);
  }

  // 2. Ensure Core Infrastructure is running (PostgreSQL & MinIO)
  console.log('📦 Ensuring PostgreSQL and MinIO containers are running...');
  try {
    execSync('docker compose up -d postgres minio createbuckets', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to start core infrastructure containers.');
    process.exit(1);
  }

  // 3. Prompt for worker selection
  const choices = [
    { title: 'Audio Worker (Voice Generation)', value: 'audio', selected: true },
    { title: 'Bubble Video Worker (Modern-TalkingHead: MuseTalk / Ditto)', value: 'bubble', selected: false },
    { title: 'Full Video Worker (Google Veo 3.1 Cloud / MiniMax TaoMate / LTX 2.5)', value: 'full', selected: false },
    { title: 'Render Worker (Remotion video composition)', value: 'render', selected: true }
  ];

  const response = await prompts({
    type: 'multiselect',
    name: 'workers',
    message: 'Select the workers you want to run (Space to select, Enter to confirm):',
    choices,
    instructions: false,
    min: 1
  });

  if (!response.workers || response.workers.length === 0) {
    console.log('No workers selected. Exiting...');
    process.exit(0);
  }

  const selectedWorkers: string[] = response.workers;

  // 4. Map workers to docker-compose.ai.yml services
  const serviceMapping: Record<string, string[]> = {
    audio: ['modern-tts', 'worker-audio'],
    bubble: ['modern-talkinghead', 'worker-bubble'],
    full: ['comfyui', 'worker-full'],
    render: ['worker-render']
  };

  const allServices = ['modern-tts', 'worker-audio', 'modern-talkinghead', 'worker-bubble', 'comfyui', 'worker-full', 'worker-render'];
  
  const selectedServices = new Set<string>();
  for (const worker of selectedWorkers) {
    const services = serviceMapping[worker];
    if (services) {
      for (const service of services) {
        selectedServices.add(service);
      }
    }
  }

  // 5. Check if images are built
  const serviceImages: Record<string, string> = {
    'modern-tts': 'modern-tts-server',
    comfyui: 'newsstudio-comfyui',
    'modern-talkinghead': 'newsstudio-modern-talkinghead',
    sadtalker: 'newsstudio-sadtalker',
    'worker-bubble': 'newsstudio-worker-bubble',
    'worker-full': 'newsstudio-worker-full',
    'worker-render': 'newsstudio-worker-render',
    'worker-audio': 'newsstudio-worker-audio'
  };

  function imageExists(imageName: string): boolean {
    try {
      const output = execSync(`docker images -q ${imageName}`, { encoding: 'utf8' }).trim();
      return output.length > 0;
    } catch {
      return false;
    }
  }

  const missingServices: string[] = [];
  for (const service of selectedServices) {
    const imageName = serviceImages[service];
    if (imageName && !imageExists(imageName)) {
      missingServices.push(service);
    }
  }

  if (missingServices.length > 0) {
    console.log(`\n🛠️  Missing Docker images for: ${missingServices.join(', ')}`);
    console.log('Building missing images now. This might take a few minutes...');
    for (const service of missingServices) {
      console.log(`\n🔨 Building ${service}...`);
      try {
        execSync(`docker compose -f docker-compose.ai.yml build ${service}`, { stdio: 'inherit' });
      } catch (error) {
        console.error(`❌ Failed to build service image: ${service}`);
        process.exit(1);
      }
    }
  }

  // 6. Start selected services
  const selectedServicesArr = Array.from(selectedServices);
  console.log(`\n🚀 Starting selected services: ${selectedServicesArr.join(', ')}...`);
  try {
    execSync(`docker compose -f docker-compose.ai.yml up -d ${selectedServicesArr.join(' ')}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to start selected Docker services.');
    process.exit(1);
  }

  // 7. Stop unselected services
  const unselectedServices = allServices.filter(s => !selectedServices.has(s));
  if (unselectedServices.length > 0) {
    console.log(`\n🛑 Stopping unselected services to free up resources: ${unselectedServices.join(', ')}...`);
    try {
      execSync(`docker compose -f docker-compose.ai.yml stop ${unselectedServices.join(' ')}`, { stdio: 'inherit' });
    } catch (error) {
      console.warn('⚠️ Warning: Failed to stop some unselected services.');
    }
  }

  // 8. Print running container status
  console.log('\n✅ Worker configuration updated! Current status:');
  try {
    execSync('docker compose -f docker-compose.ai.yml ps', { stdio: 'inherit' });
    console.log('\nMain storage status:');
    execSync('docker compose ps', { stdio: 'inherit' });
  } catch (error) {
    // Ignore error
  }
}

main().catch(error => {
  console.error('Fatal CLI Error:', error);
  process.exit(1);
});
