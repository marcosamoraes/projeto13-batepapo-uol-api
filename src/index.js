import * as dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Message from "./schemas/Message.js";
import Participant from "./schemas/Participant.js";
import { MongoClient, ObjectId } from "mongodb";
import { validateMessageStoreSchema, validateParticipantStoreSchema } from "./validator.js";

dotenv.config();
const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
const db = mongoClient.db();

setInterval(async () => {
	const participants = await db.collection("participants").find({lastStatus:{$lt:new Date()-10000}}).toArray();

	participants.map(participant => removeParticipant(participant))
}, 15000);

const removeParticipant = async (participant) => {
	const session = mongoClient.startSession();

	try {
		session.startTransaction();

		const message = new Message({
			from: participant.name,
			text: "sai da sala...",
		});

		await db.collection("messages").insertOne(message);
		await db.collection("participants").deleteOne({_id: participant._id});

		await session.commitTransaction();
	} catch (error) {
		await session.abortTransaction();
	} finally {
		await session.endSession();
	}
}

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
			text: "entra na sala...",
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
	const limit = req.query.limit ? parseInt(req.query.limit) : null;
	const participant = await db.collection("participants").find({ name: req.headers.user }).next();

  if (limit !== null && (limit <= 0 || isNaN(limit)) ) return res.sendStatus(422);

	if (!participant) return res.sendStatus(401);

	let messages;

	const query = {
		$or: [
			{
				type: 'status',
			},
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

	messages = await db.collection("messages").find(query, {limit: limit ? parseInt(limit) : null, sort: {_id: -1}}).toArray();

	return res.send(messages);
});

app.post("/status", async (req, res) => {
	const participant = await db.collection("participants").find({ name: req.headers.user }).next();

	if (!participant) return res.sendStatus(404);

	try {
		await db.collection("participants").updateOne({name: participant.name}, { $set: {lastStatus: Date.now()}});

		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

app.delete("/messages/:id", async (req, res) => {
	const { id } = req.params;

	const participant = await db.collection("participants").find({ name: req.headers.user }).next();

	const message = await db.collection("messages").find({_id: ObjectId(id)}).next();

	if (!message) return res.sendStatus(404);

	if (message.from !== participant.name) return res.sendStatus(401);

	await db.collection("messages").deleteOne({_id: message._id});

	return res.sendStatus(200);
});

app.put("/messages/:id", async (req, res) => {
	const { id } = req.params;
	const { to, text, type, error } = validateMessageStoreSchema(req.body);
	const participant = await db.collection("participants").find({ name: req.headers.user }).next();

	if (error || !participant) return res.sendStatus(422);

	const message = await db.collection("messages").find({_id: ObjectId(id)}).next();

	if (!message) return res.sendStatus(404);

	if (message.from !== participant.name) return res.sendStatus(401);

	try {
		const data = { to: to, text: text, type: type };
		await db.collection("messages").updateOne({_id: message._id}, {$set: data});

		return res.sendStatus(200);
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
