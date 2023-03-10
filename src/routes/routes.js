import express from "express";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { get } from "http";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const file = join(__dirname, "../db/users.json");
const adapter = new JSONFile(file);
const db_users = new Low(adapter);

const file2 = join(__dirname, "../db/channelID.json");
const adapter2 = new JSONFile(file2);
const db_channelID = new Low(adapter2);

const file3 = join(__dirname, "../db/messageID.json");
const adapter3 = new JSONFile(file3);
const db_messageID = new Low(adapter3);

const file4 = join(__dirname, "../db/uuID.json");
const adapter4 = new JSONFile(file4);
const db_uuID = new Low(adapter4);

const file5 = join(__dirname, "../db/channel.json");
const adapter5 = new JSONFile(file5);
const db_channel = new Low(adapter5);

dotenv.config();

const SALT = process.env.SALT;

const router = express.Router();

await db_users.read(), db_uuID.read(), db_messageID.read(), db_channelID.read();

router.get("/", (req, res) => {
  console.log(db_users.data[0].name);
  res.sendStatus(200);
});

router.get("/getUUID/:id", async (req, res) => {
  await db_users.read();
  const requuid = Number(req.params.id);
  const user = db_users.data.find((user) => user.uuid === requuid);
  console.log("user", user);
  if (!user) {
    return res.status(404).send({ message: "User not found" });
  }
  console.log("user", user);

  res.json(user);
});

router.get("/getUser/:username", async (req, res) => {
  try {
    await db_users.read();
    const user = db_users.data.find((u) => u.username === req.params.username);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    const ret = { username: user.username, uuid: user.uuid };
    res.send(ret);
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: "Error reading users from file" });
  }
});

router.get("/style.css", function (req, res) {
  res.sendFile(__dirname + "/static/index.css");
});

router.get("/messages/:id", async (req, res) => {
  await updateDataFromAllDB();
  const channelId = req.params.id;
  console.log(channelId);
  const channel = db_channel.data.find(
    (channel) => channel.channelID === Number(channelId)
  );
  console.log(channel);
  if (!channel) {
    res.sendStatus(404);
    return;
    console.log(channel);
  }

  const updatedChat = channel.chat.map((message) => {
    if (message.deleted) {
      return {
        ...message,
        message: "Message deleted",
        timestamp: message.deletedTimestamp,
      };
    } else {
      return message;
    }
  });

  res.send(updatedChat);
});

router.get("/channels", async (req, res) => {
  await updateDataFromAllDB();
  res.send(db_channel.data);
});

router.post("/verifyToken", async (req, res) => {
  await db_users.read();
  let token = req.headers.authorization?.split(" ")[1];
  console.log("token", token);
  if (!token) {
    res.sendStatus(401);
    return;
  }
  let decoded = decode(token);
  if (decoded === false) {
    res.sendStatus(401);
    return;
  }
  res.status(200).send(decoded);
});

router.post("/newUser", (req, res) => {
  const username = req.body.name;
  const password = req.body.password;

  if (nameExist(username) !== false) {
    res.sendStatus(400);
  } else {
    newUser(username, password);
    res.sendStatus(201);
  }
});

router.post("/login", async (req, res) => {
  await updateDataFromAllDB();
  const username = req.body.username;
  const password = req.body.password;
  let hashedPassword = bcrypt.hashSync(password, SALT);
  if (
    username === (undefined || "") ||
    password === (undefined || "") ||
    nameExist(username) === false
  ) {
    res.sendStatus(400);
    return;
  }
  const nameIndex = nameExist(username);
  /*  console.log("nameindex:", nameIndex);
  console.log("Lösenord i DB", db_users.data[nameIndex].password);
  console.log("Lösenord  skickat", hashedPassword); */

  if (db_users.data[nameIndex].password !== hashedPassword) {
    console.log("Wrong password");
    res.sendStatus(401);
    return;
  }
  const nameToken = createToken(username);
  res.status(200).send({ token: nameToken.token });
  console.log(nameToken);
});

router.post("/newMessage", async (req, res) => {
  await updateDataFromAllDB();
  const channelId = req.body.channel_id;
  const channelIndex = await channelExistsById(channelId);
  const uuid = req.body.uuid;
  const message = req.body.message;
  const timestamp = generateDate();
  console.log("req.body", req.body);

  console.log("1--", correctChannelInput(channelId));
  console.log("3--", correctMessageInput(message));
  console.log("4--", channelIndex);

  if (
    correctChannelInput(channelId) === false ||
    correctMessageInput(message) === false ||
    channelIndex === false ||
    (await userExists(uuid)) === false
  ) {
    res.sendStatus(400);
    return;
  }
  console.log(channelIndex, uuid, message, timestamp);
  newChatMessageToChannel(channelIndex, uuid, message, timestamp);
  res.sendStatus(201);
});

router.post("/createChannel", async (req, res) => {
  await updateDataFromAllDB();
  const channelName = req.body.channelName;
  const status = req.body.status;

  if (
    correctChannelInput(channelName) === false ||
    correctStatusInput(status) === false
  ) {
    res.sendStatus(400);
    return;
  }

  const nextChannelID = db_channelID.data.nextchannelID++;
  const newChannel = {
    channelID: nextChannelID,
    channelName: channelName,
    status: status,
    chat: [],
  };
  db_channel.data.push(newChannel);
  await db_channel.write(), db_channelID.write();
  res.sendStatus(201);
});

router.put("/editMessage/:id", async (req, res) => {
  await updateDataFromAllDB();
  const messageID = req.params.id;
  const newMessage = req.body.message;

  console.log(messageID);
  console.log(newMessage);

  let messageToEdit = findMessageByID(messageID);
  if (!messageToEdit) {
    res.sendStatus(404);
    console.log(messageToEdit, "This is the edited message right?");
    return;
  }

  const editedTimestamp = generateDate();
  messageToEdit.message = newMessage;
  messageToEdit.editedTimestamp = editedTimestamp;
  messageToEdit.edited = true;
  await db_channel.write();
  res.sendStatus(200);
});

router.delete("/deleteMessage/:id", async (req, res) => {
  await updateDataFromAllDB();
  const messageID = req.params.id;
  console.log(messageID);

  let messageToDelete = findMessageByID(messageID);
  if (!messageToDelete) {
    res.sendStatus(404);
    return;
  }
  messageToDelete.deleted = true;
  messageToDelete.deletedTimestamp = generateDate();
  await db_channel.write();
  res.sendStatus(200);
});

router.get("/logout", (req, res) => {
  res.clearCookie("nameToken");
  res.sendStatus(200);
});

function findMessageByID(messageID) {
  for (const channel of db_channel.data) {
    for (const message of channel.chat) {
      if (message.messageid === Number(messageID) && !message.deleted) {
        return message;
      }
    }
  }
  return null;
}

function correctStatusInput(status) {
  return status === "private" || status === "public";
}

async function newChatMessageToChannel(channelIndex, uuid, message, timestamp) {
  let nextMessageID = db_messageID.data.nextmessageID++;
  db_channel.data[channelIndex].chat.push({
    messageid: nextMessageID,
    uuid: uuid,
    message: message,
    timestamp: timestamp,
  });
  await db_channel.write(), db_messageID.write();
}
function correctChannelInput(channelName) {
  return typeof channelName === "string" && channelName.length > 0;
}

function correctMessageInput(message) {
  return message.length > 0;
}

async function channelExistsById(channelId) {
  console.log("channelExistsById-channelID", channelId);
  const channelIndex = await db_channel.data.findIndex(
    (channel) => channel.channelID === Number(channelId)
  );
  console.log("channelIndex", channelIndex);
  if (channelIndex >= 0) {
    console.log("Channel exists");
    return channelIndex;
  } else {
    return false;
  }
}

async function userExists(uuid) {
  console.log("INPUT", uuid);
  const user = await db_users.data.find((user) => user.uuid === Number(uuid));
  console.log("USER", user);
  if (user === undefined) {
    return false;
  }
  return true;
}
async function updateDataFromAllDB() {
  try {
    await Promise.all([
      db_channel.read(),
      db_messageID.read(),
      db_users.read(),
    ]);
  } catch (err) {
    console.error("Error reading data from databases:", err);
  }
}

async function newUser(name, password) {
  let nextuID = db_uuID.data.nextuuID++;
  console.log(nextuID);
  let hashedPassword = bcrypt.hashSync(password, SALT);
  console.log(hashedPassword);

  db_users.data.push({
    uuid: nextuID,
    username: name,
    password: hashedPassword,
  });
  await db_uuID.write();
  await db_users.write();
}

function nameExist(name) {
  let findName = db_users.data.findIndex((user) => user.username === name);
  if (findName >= 0) {
    return findName;
  } else {
    return false;
  }
}

function createToken(name) {
  const user = { username: name };
  const token = jwt.sign(user, process.env.TOKEN_SECRET, {
    expiresIn: process.env.JWTEXPIRES,
  });
  user.token = token;
  console.log("NEW JWT", name);
  return user;
}
function generateDate() {
  const dateAndTime = new Date().toISOString();
  const date = dateAndTime.slice(0, 10);
  const time = dateAndTime.slice(11, 19);
  const newDateAndTime = `${date} ${time}`;
  return newDateAndTime;
}

function decode(token) {
  if (token) {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.TOKEN_SECRET);
    } catch (error) {
      console.log("ogiltig token", error);
      return false;
    }
    console.log("decoded", decoded);
    return decoded;
  } else {
    console.log("no token");
    return false;
  }
}

export default router;
