const { MongoClient } = require('mongodb');

let dbConnection;

const connectToDb = async () => {
    if (dbConnection) {
        return dbConnection;
    }
    try {
        const client = await MongoClient.connect(process.env.MONGO_CONNECTION_URI);
        dbConnection = client.db(process.env.MONGO_DB_NAME);
        console.log('Connected to MongoDB');
        return dbConnection;
    } catch (e) {
        console.error('Could not connect to MongoDB.', e);
        throw e;
    }
};

const getDb = () => dbConnection;

module.exports = { connectToDb, getDb };
