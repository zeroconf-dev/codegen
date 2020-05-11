import { loadConfig } from '@zeroconf/codegen/Config';
import { run } from '@zeroconf/codegen/Runner';

async function main() {
	const config = await loadConfig();
	if (config == null) {
		throw new Error('Config file not found.');
	}
	return run(config);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
