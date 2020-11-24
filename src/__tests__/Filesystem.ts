import { Filesystem } from '@zeroconf/codegen/Filesystem';
import * as path from 'path';

const createFilesystem = () => new Filesystem();

describe('Filesystem', () => {
	test('loading ExportDirectory text fixtures/Loaders collects the files in a stream', async () => {
		const fs = createFilesystem();
		const stream = fs.loadFiles(
			path.join(__dirname, '..', 'Plugins', 'ExportDirectory', '__tests__', 'fixtures', 'Loaders'),
			'**/*.ts',
			'Loaders.ts',
		);
		const result: string[] = [];

		for await (const filePath of stream) {
			result.push(filePath);
		}

		result.sort(); // ensuring order of results to make the test stable.

		expect(result).toMatchInlineSnapshot(`
		Array [
		  "Category/CategoryForums.ts",
		  "Channel.ts",
		  "Forum.ts",
		  "Forum/ForumPosts.ts",
		  "Forum/ForumTopics.ts",
		  "Profile.ts",
		  "Profile/ProfileChannels.ts",
		  "Profile/ProfilePosts.ts",
		  "Topic/TopicPosts.ts",
		  "User.ts",
		]
	`);
	});
});
