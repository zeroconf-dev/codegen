import { ExportType, generate } from '@zeroconf/codegen/Plugins/ExportDirectory';
import { createGenerateContext } from '@zeroconf/codegen/Runner';
import { Level } from 'ansi-logger';
import { join } from 'path';
import { PassThrough } from 'stream';

function createOutputStream(): [PassThrough, Buffer[]] {
	const chunks: Buffer[] = [];
	const outputStream = new PassThrough({
		write: (chunk, _encoding, cb) => {
			chunks.push(chunk);
			cb();
		},
	});

	return [outputStream, chunks];
}

describe('SingletonClass', () => {
	test('additionalImports', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'non-existing'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			additionalImports: ['@zeroconf/codegen/Context#Context', 'redis#[RedisClient]'],
			className: 'SingletonClass',
			exportType: ExportType.SingletonClass,
			importPrefix: '../../',
			importTemplate: '${fileName}',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		import { Context } from \\"@zeroconf/codegen/Context\\";
		import RedisClient from \\"redis\\";
		export class SingletonClass {
		}
		"
	`);
	});

	test('className', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'non-existing'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'TestClass',
			exportType: ExportType.SingletonClass,
			importPrefix: '../../',
			importTemplate: '${fileName}',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		export class TestClass {
		}
		"
	`);
	});

	test('constructorParameters', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'non-existing'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'TestClass',
			constructorParameters: [
				{ paramName: 'applicationName', paramType: 'string' },
				{ paramName: 'startTime', paramType: 'number' },
			],
			exportType: ExportType.SingletonClass,
			importPrefix: '../../',
			importTemplate: '${fileName}',
		});
		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		export class TestClass {
		    private readonly applicationName: string;
		    private readonly startTime: number;
		    public constructor(applicationName: string, startTime: number) {
		        this.applicationName = applicationName;
		        this.startTime = startTime;
		    }
		}
		"
	`);
	});

	test('defaultExport', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'non-existing'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'TestClass',
			defaultExport: true,
			exportType: ExportType.SingletonClass,
			importPrefix: '../../',
			importTemplate: '${fileName}',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		export default class TestClass {
		}
		"
	`);
	});

	test('exportTemplate', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'Loaders'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'TestClass',
			exportTemplate: 'Loader${fileName}',
			exportType: ExportType.SingletonClass,
			importPrefix: '../../',
			importTemplate: '${fileName}',
		});
		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		import { Channel } from \\"../../Channel\\";
		import { Forum } from \\"../../Forum\\";
		import { Profile } from \\"../../Profile\\";
		import { User } from \\"../../User\\";
		export class TestClass {
		    private _LoaderChannel: Maybe<Channel> = null;
		    private _LoaderForum: Maybe<Forum> = null;
		    private _LoaderProfile: Maybe<Profile> = null;
		    private _LoaderUser: Maybe<User> = null;
		    public get LoaderChannel(): Channel {
		        if (this._LoaderChannel == null) {
		            this._LoaderChannel = new Channel;
		        }
		        return this._LoaderChannel;
		    }
		    public get LoaderForum(): Forum {
		        if (this._LoaderForum == null) {
		            this._LoaderForum = new Forum;
		        }
		        return this._LoaderForum;
		    }
		    public get LoaderProfile(): Profile {
		        if (this._LoaderProfile == null) {
		            this._LoaderProfile = new Profile;
		        }
		        return this._LoaderProfile;
		    }
		    public get LoaderUser(): User {
		        if (this._LoaderUser == null) {
		            this._LoaderUser = new User;
		        }
		        return this._LoaderUser;
		    }
		}
		"
	`);
	});

	test('globPattern', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'Loaders'),
					globPattern: '**/*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'TestClass',
			exportType: ExportType.SingletonClass,
			importPrefix: '../../',
			importTemplate: '${fileName}',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		import { CategoryForums } from \\"../../Category/CategoryForums\\";
		import { Channel } from \\"../../Channel\\";
		import { Forum } from \\"../../Forum\\";
		import { ForumPosts } from \\"../../Forum/ForumPosts\\";
		import { ForumTopics } from \\"../../Forum/ForumTopics\\";
		import { Profile } from \\"../../Profile\\";
		import { ProfileChannels } from \\"../../Profile/ProfileChannels\\";
		import { ProfilePosts } from \\"../../Profile/ProfilePosts\\";
		import { TopicPosts } from \\"../../Topic/TopicPosts\\";
		import { User } from \\"../../User\\";
		export class TestClass {
		    private _CategoryForums: Maybe<CategoryForums> = null;
		    private _Channel: Maybe<Channel> = null;
		    private _Forum: Maybe<Forum> = null;
		    private _ForumPosts: Maybe<ForumPosts> = null;
		    private _ForumTopics: Maybe<ForumTopics> = null;
		    private _Profile: Maybe<Profile> = null;
		    private _ProfileChannels: Maybe<ProfileChannels> = null;
		    private _ProfilePosts: Maybe<ProfilePosts> = null;
		    private _TopicPosts: Maybe<TopicPosts> = null;
		    private _User: Maybe<User> = null;
		    public get CategoryForums(): CategoryForums {
		        if (this._CategoryForums == null) {
		            this._CategoryForums = new CategoryForums;
		        }
		        return this._CategoryForums;
		    }
		    public get Channel(): Channel {
		        if (this._Channel == null) {
		            this._Channel = new Channel;
		        }
		        return this._Channel;
		    }
		    public get Forum(): Forum {
		        if (this._Forum == null) {
		            this._Forum = new Forum;
		        }
		        return this._Forum;
		    }
		    public get ForumPosts(): ForumPosts {
		        if (this._ForumPosts == null) {
		            this._ForumPosts = new ForumPosts;
		        }
		        return this._ForumPosts;
		    }
		    public get ForumTopics(): ForumTopics {
		        if (this._ForumTopics == null) {
		            this._ForumTopics = new ForumTopics;
		        }
		        return this._ForumTopics;
		    }
		    public get Profile(): Profile {
		        if (this._Profile == null) {
		            this._Profile = new Profile;
		        }
		        return this._Profile;
		    }
		    public get ProfileChannels(): ProfileChannels {
		        if (this._ProfileChannels == null) {
		            this._ProfileChannels = new ProfileChannels;
		        }
		        return this._ProfileChannels;
		    }
		    public get ProfilePosts(): ProfilePosts {
		        if (this._ProfilePosts == null) {
		            this._ProfilePosts = new ProfilePosts;
		        }
		        return this._ProfilePosts;
		    }
		    public get TopicPosts(): TopicPosts {
		        if (this._TopicPosts == null) {
		            this._TopicPosts = new TopicPosts;
		        }
		        return this._TopicPosts;
		    }
		    public get User(): User {
		        if (this._User == null) {
		            this._User = new User;
		        }
		        return this._User;
		    }
		}
		"
	`);
	});

	test('headerComment', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'Loaders'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'TestClass',
			exportType: ExportType.SingletonClass,
			headerComment: `CUSTOM HEADER
BUT YOU STILL SHOULDN'T EDIT THIS FILE.`,
			importPrefix: '../../',
			importTemplate: '${fileName}',
		});
		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// CUSTOM HEADER
		// BUT YOU STILL SHOULDN'T EDIT THIS FILE.
		import { Channel } from \\"../../Channel\\";
		import { Forum } from \\"../../Forum\\";
		import { Profile } from \\"../../Profile\\";
		import { User } from \\"../../User\\";
		export class TestClass {
		    private _Channel: Maybe<Channel> = null;
		    private _Forum: Maybe<Forum> = null;
		    private _Profile: Maybe<Profile> = null;
		    private _User: Maybe<User> = null;
		    public get Channel(): Channel {
		        if (this._Channel == null) {
		            this._Channel = new Channel;
		        }
		        return this._Channel;
		    }
		    public get Forum(): Forum {
		        if (this._Forum == null) {
		            this._Forum = new Forum;
		        }
		        return this._Forum;
		    }
		    public get Profile(): Profile {
		        if (this._Profile == null) {
		            this._Profile = new Profile;
		        }
		        return this._Profile;
		    }
		    public get User(): User {
		        if (this._User == null) {
		            this._User = new User;
		        }
		        return this._User;
		    }
		}
		"
	`);
	});

	test('importPrefix', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'Loaders'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'TestClass',
			exportType: ExportType.SingletonClass,
			importPrefix: '@app/Loaders',
			importTemplate: '${fileName}',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		import { Channel } from \\"@app/Loaders/Channel\\";
		import { Forum } from \\"@app/Loaders/Forum\\";
		import { Profile } from \\"@app/Loaders/Profile\\";
		import { User } from \\"@app/Loaders/User\\";
		export class TestClass {
		    private _Channel: Maybe<Channel> = null;
		    private _Forum: Maybe<Forum> = null;
		    private _Profile: Maybe<Profile> = null;
		    private _User: Maybe<User> = null;
		    public get Channel(): Channel {
		        if (this._Channel == null) {
		            this._Channel = new Channel;
		        }
		        return this._Channel;
		    }
		    public get Forum(): Forum {
		        if (this._Forum == null) {
		            this._Forum = new Forum;
		        }
		        return this._Forum;
		    }
		    public get Profile(): Profile {
		        if (this._Profile == null) {
		            this._Profile = new Profile;
		        }
		        return this._Profile;
		    }
		    public get User(): User {
		        if (this._User == null) {
		            this._User = new User;
		        }
		        return this._User;
		    }
		}
		"
	`);
	});

	test('importTemplate', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'Loaders'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'TestClass',
			exportType: ExportType.SingletonClass,
			importPrefix: '../',
			importTemplate: '${fileName}Loader',
		});
		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		import { ChannelLoader } from \\"../Channel\\";
		import { ForumLoader } from \\"../Forum\\";
		import { ProfileLoader } from \\"../Profile\\";
		import { UserLoader } from \\"../User\\";
		export class TestClass {
		    private _ChannelLoader: Maybe<ChannelLoader> = null;
		    private _ForumLoader: Maybe<ForumLoader> = null;
		    private _ProfileLoader: Maybe<ProfileLoader> = null;
		    private _UserLoader: Maybe<UserLoader> = null;
		    public get ChannelLoader(): ChannelLoader {
		        if (this._ChannelLoader == null) {
		            this._ChannelLoader = new ChannelLoader;
		        }
		        return this._ChannelLoader;
		    }
		    public get ForumLoader(): ForumLoader {
		        if (this._ForumLoader == null) {
		            this._ForumLoader = new ForumLoader;
		        }
		        return this._ForumLoader;
		    }
		    public get ProfileLoader(): ProfileLoader {
		        if (this._ProfileLoader == null) {
		            this._ProfileLoader = new ProfileLoader;
		        }
		        return this._ProfileLoader;
		    }
		    public get UserLoader(): UserLoader {
		        if (this._UserLoader == null) {
		            this._UserLoader = new UserLoader;
		        }
		        return this._UserLoader;
		    }
		}
		"
	`);
	});

	test('unnamed className', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'nowhere'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			defaultExport: true,
			exportType: ExportType.SingletonClass,
			importPrefix: '@zeroconf/codegen/Loaders',
			importTemplate: '${fileName}',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		export default class {
		}
		"
	`);
	});

	test('default export', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'Loaders'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			className: 'Loaders',
			defaultExport: true,
			exportType: ExportType.SingletonClass,
			exportTemplate: '${fileName}',
			importPrefix: '@zeroconf/codegen/Loaders',
			importTemplate: '${fileName}Loader',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		import { ChannelLoader } from \\"@zeroconf/codegen/Loaders/Channel\\";
		import { ForumLoader } from \\"@zeroconf/codegen/Loaders/Forum\\";
		import { ProfileLoader } from \\"@zeroconf/codegen/Loaders/Profile\\";
		import { UserLoader } from \\"@zeroconf/codegen/Loaders/User\\";
		export default class Loaders {
		    private _Channel: Maybe<ChannelLoader> = null;
		    private _Forum: Maybe<ForumLoader> = null;
		    private _Profile: Maybe<ProfileLoader> = null;
		    private _User: Maybe<UserLoader> = null;
		    public get Channel(): ChannelLoader {
		        if (this._Channel == null) {
		            this._Channel = new ChannelLoader;
		        }
		        return this._Channel;
		    }
		    public get Forum(): ForumLoader {
		        if (this._Forum == null) {
		            this._Forum = new ForumLoader;
		        }
		        return this._Forum;
		    }
		    public get Profile(): ProfileLoader {
		        if (this._Profile == null) {
		            this._Profile = new ProfileLoader;
		        }
		        return this._Profile;
		    }
		    public get User(): UserLoader {
		        if (this._User == null) {
		            this._User = new UserLoader;
		        }
		        return this._User;
		    }
		}
		"
	`);
	});
});

describe('ReExport', () => {
	test('exportTemplate', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'Loaders'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			exportType: ExportType.ReExport,
			exportTemplate: '${fileName}Loader',
			importPrefix: '@zeroconf/codegen/Loaders',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		export { Channel as ChannelLoader } from \\"@zeroconf/codegen/Loaders/Channel\\";
		export { Forum as ForumLoader } from \\"@zeroconf/codegen/Loaders/Forum\\";
		export { Profile as ProfileLoader } from \\"@zeroconf/codegen/Loaders/Profile\\";
		export { User as UserLoader } from \\"@zeroconf/codegen/Loaders/User\\";
		"
	`);
	});

	test('emptyFile', async () => {
		const [outputStream, chunks] = createOutputStream();
		const context = await createGenerateContext(
			{
				logLevel: Level.SILENT,
				outputConfig: {
					directory: join(__dirname, 'fixtures', 'nowhere'),
					globPattern: '*.ts',
				},
				outputStream: outputStream,
			},
			{},
		);

		await generate(context as any, {
			exportType: ExportType.ReExport,
			importPrefix: '',
		});

		expect(Buffer.concat(chunks).toString()).toMatchInlineSnapshot(`
		"// THIS FILE IS GENERATED BY @zeroconf/codegen
		// DO NOT EDIT DIRECTLY, CHANGES WILL BE DELETED UPON NEXT CODE GENERATION.
		"
	`);
	});
});
