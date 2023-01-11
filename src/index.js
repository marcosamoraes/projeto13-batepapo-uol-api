import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Message from "./schemas/Message.js";
import Participant from "./schemas/Participant.js";
import { MongoClient } from "mongodb";
import { validateMessageStoreSchema, validateParticipantStoreSchema } from "./validator.js";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
const db = mongoClient.db();

app.post("/participants", async (req, res) => {
	const { name, error } = validateParticipantStoreSchema(req.body);

	if (error) return res.sendStatus(422);

	const session = mongoClient.startSession();

	try {
		if (await db.collection("participants").countDocuments({ name: name }, { limit: 1 }))
			return res.sendStatus(409);

		session.startTransaction();

		const participant = new Participant({ name });
		await db.collection("participants").insertOne(participant);

		const message = new Message({
			from: participant.name,
			text: "Entrou na sala...",
		});
		await db.collection("messages").insertOne(message);

		await session.commitTransaction();
		return res.sendStatus(201);
	} catch (error) {
		await session.abortTransaction();
		return res.sendStatus(500);
	} finally {
		await session.endSession();
	}
});

app.get("/participants", async (req, res) => {
	const participants = await db.collection("participants").find().toArray();
	return res.send(participants);
});

app.post("/messages", async (req, res) => {
	const { to, text, type, error } = validateMessageStoreSchema(req.body);
	const participant = await db.collection("participants").find({ name: req.headers.user }).next();

	if (error || !participant) return res.sendStatus(422);

	try {
		const message = new Message({
			to: to,
			text: text,
			type: type,
			from: participant.name,
		});
		await db.collection("messages").insertOne(message);

		return res.sendStatus(201);
	} catch (error) {
		return res.sendStatus(500);
	}
});

app.get("/messages", async (req, res) => {
	const { limit } = req.query;
	const participant = await db.collection("participants").find({ name: req.headers.user }).next();

	let messages;

	const query = {
		$or: [
			{
				type: 'message',
			},
			{
				type: 'private_message',
				from: participant.name
			},
			{
				type: 'private_message',
				to: participant.name
			}
		]
	}

	messages = await db.collection("messages").find(query, {limit: limit ? parseInt(limit) : null}).toArray();

	return res.send(messages);
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
