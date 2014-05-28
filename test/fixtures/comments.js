var mongojs = require('mongojs');

module.exports = [
	{
		owner: 'user_1',
		album: 'album_1',
		title: 'title_1',
		content: 'Their best yet',
		created: new Date(1401267457650),
		updated: new Date(1401267457650),
		score: mongojs.NumberLong.fromString('25550'),
		external: {
			id: new mongojs.ObjectId('5385a5187d4221c5a8cadb0b'),
			timestamp: mongojs.Timestamp.fromNumber(1401267457650),
			access: mongojs.NumberLong.fromNumber(0)
		}
	},
	{
		owner: 'user_1',
		album: 'album_1',
		title: 'title_2',
		content: 'Still the best',
		created: new Date(1401267457888),
		updated: new Date(1401267457888),
		score: mongojs.NumberLong.fromString('25555550000001002'),
		external: {
			id: new mongojs.ObjectId('5385a9577d4221c5a8cadb0c'),
			timestamp: mongojs.Timestamp.fromNumber(1401267457888),
			access: mongojs.NumberLong.fromNumber(5)
		}
	},
	{
		owner: 'user_2',
		album: 'album_3',
		title: 'title_1',
		content: 'What is this?',
		created: new Date(1401267450100),
		updated: new Date(1401267450100),
		score: mongojs.NumberLong.fromNumber('2555555000000300400'),
		external: {
			id: new mongojs.ObjectId('5385a9d47d4221c5a8cadb0d'),
			timestamp: mongojs.Timestamp.fromNumber(1401267450100),
			access: mongojs.NumberLong.fromNumber(2300)
		}
	}
];
