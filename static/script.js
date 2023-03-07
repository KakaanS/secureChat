let currentUser = null;
let selectedChannel = null;

const fetchChannelsFromServer = async () => {
  const response = await fetch("http://localhost:3000/api/channels");
  const channels = await response.json();

  channels.forEach((channel) => {
    const isPublic = channel.status.toLowerCase() === "public";
    buildChannelListViaTemplate(
      channel.channelName,
      isPublic,
      channel.channelID
    );
  });
};

const addNewChannelButton = document.querySelector("#addNewChannel");

addNewChannelButton.addEventListener("click", () => {
  createChannel();
});

const createChannel = () => {
  const newChannelInput = document.querySelector(".newChannel");
  const privateCheckbox = document.querySelector("#private");

  const channelName = newChannelInput.value;
  let status;
  if (privateCheckbox.checked === false) {
    status = "Public";
  } else {
    status = "Private";
  }

  fetch("/api/createChannel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channelName, status }),
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Channel created successfully", data);
    })
    .catch((error) => {
      console.error("Error creating channel", error);
    });
};

const fetchUserNameFromUuid = async (uuid) => {
  const response = await fetch(`http://localhost:3000/api/getUUID/${uuid}`);
  const user = await response.json();
  return user.username;
};

const fetchChannelMessages = async (channelID) => {
  const response = await fetch(
    `http://localhost:3000/api/messages/${channelID}`
  );
  const channelMessages = await response.json();

  const messages = channelMessages;
  messages.forEach(async (item) => {
    const { message, timestamp, uuid } = item;
    const username = await fetchUserNameFromUuid(uuid);
    buildMessageChatViaTemplate(message, timestamp, username);
  });
};

const isLoggedIn = () => {
  if (currentUser != null) {
    return true;
  } else {
    return false;
  }
};

const selectChannelHandler = (event) => {
  clearMessageContainer();
  const target = event.target;
  const channel_id = target.getAttribute("data-id");
  const channel_status = target.getAttribute("data-status");
  const channelIsPublic = channel_status.toLowerCase() === "true";

  const channelWrapperButtons = document.querySelectorAll(".wrapButton");
  channelWrapperButtons.forEach((button) => {
    button.classList.remove("selected");
  });

  target.classList.add("selected");

  selectedChannel = target.getAttribute("data-id");
  const userIsLoggedIn = currentUser !== null;
  if (userIsLoggedIn) {
    fetchChannelMessages(selectedChannel);
  }
  if (!userIsLoggedIn && channelIsPublic) {
    fetchChannelMessages(selectedChannel);
  }
  if (!userIsLoggedIn && !channelIsPublic) {
    console.log("Not allowed to view contents of channel");
  }
};

const clearMessageContainer = () => {
  const message_container = document.querySelector(".messageContainer");
  message_container.innerHTML = "";
};

async function getUserUUID(username) {
  const response = await fetch(`/api/getUser/${username}`);
  if (!response.ok) {
    console.error("Error: Could not fetch user data");
    return;
  }
  const user = await response.json();
  return user.uuid;
}

const postMessage = async () => {
  if (!currentUser) {
    console.error("Error: User is not logged in. Please log in first.");
    return;
  }

  const uuid = await getUserUUID(currentUser);
  if (!uuid) {
    console.error("Error: uuid is undefined. Could not retrieve user id");
    return;
  }
  console.log("currentUser", currentUser);
  console.log("uuid", uuid);

  const message = document.querySelector(".messageInput");
  const channelName = document.querySelector(".channelName");
  const dataID = selectedChannel;
  const body = {
    channel_id: dataID,
    uuid: uuid,
    message: message.value,
  };

  const response = await fetch("/api/newMessage", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 201) {
    clearMessageContainer();
    await fetchChannelMessages(selectedChannel);
  } else {
    console.error("Error posting message");
  }
};

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".messageSend").addEventListener("click", function () {
    postMessage();
  });
});

// 1.0 Kolla först om det finns en JWT i localstorage.
//// 1.1 Om det finns, verifiera den.
//// 1.2 Uppdatera Loginstatus och vilken användare som är inloggad
//// 1.3 Lås upp de låsta kanaleran
//// 1.4 Göra det möjligt att skicka nya medelanden
//// 1.5 Göra det möjligt att skapa nya kanaler

async function verifyToken() {
  const token = localStorage.getItem("jwt");
  console.log("TOKEN", token);
  if (!token) return;
  console.log("VERIFY TOKEN");
  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
  const response = await fetch("/api/verifyToken", options);
  if (response.status === 200) {
    const user = await response.json();
    currentUser = user.username;
    changeTextAndHideInputs(user.username);
  }
}

async function changeTextAndHideInputs(currentUser) {
  const welcomeText = document.querySelector(".welcomeText");
  console.log(welcomeText);

  welcomeText.innerText = "Welcome, " + currentUser;

  const loginInput = document.querySelector(".login");
  const passwordInput = document.querySelector(".password");
  const signIn = document.querySelector(".signIn");
  const signUp = document.querySelector(".signUp");
  const logout = document.querySelector(".logout");

  loginInput.style.display = "none";
  passwordInput.style.display = "none";
  signIn.style.display = "none";
  signUp.style.display = "none";
  logout.style.display = "block";
}

document.addEventListener("DOMContentLoaded", function () {
  async function login() {
    const username = document.querySelector(".login").value;
    const password = document.querySelector(".password").value;

    console.log("username: ", username);
    console.log("password:", password);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: username, password: password }),
    });
    console.log(response);

    if (response.status === 200) {
      const nameToken = await response.json();
      localStorage.setItem("jwt", nameToken.token);
      console.log("i LOGIN", nameToken.token);
      currentUser = username;
      verifyToken();
    } else if (response.status === 400) {
      console.error("Bad request: missing or incorrect input");
    } else if (response.status === 401) {
      console.error("Unauthorized: incorrect password");
    }
  }
  document.querySelector(".signIn").addEventListener("click", login);
});

document.addEventListener("DOMContentLoaded", async function () {
  await verifyToken();
});

document.addEventListener("DOMContentLoaded", function () {
  async function createNewUser() {
    const username = document.querySelector(".login").value;
    const password = document.querySelector(".password").value;

    const response = await fetch("/api/newUser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: username, password: password }),
    });

    if (response.status === 201) {
      console.log("New user created successfully!");
    } else if (response.status === 400) {
      console.error("Bad request: missing or incorrect input");
    } else {
      console.error("An error occurred while creating the new user");
    }
  }

  document.querySelector(".signUp").addEventListener("click", createNewUser);
});

const buildChannelListViaTemplate = (text, isPublic, channelID) => {
  const channelContainer = document.querySelector(".channelContainer");
  const template = document.querySelector("#channelTemplate");
  const clone = template.content.cloneNode(true);
  const channel_name = clone.querySelector(".channelName");
  const channel_status = clone.querySelector(".status");
  const channel_wrap_button = clone.querySelector(".wrapButton");
  /* console.log("is it public eller?", isPublic); */
  if (isPublic) {
    channel_status.innerText = "";
  }

  channel_name.innerText = text;
  channel_wrap_button.setAttribute("data-id", channelID);
  channel_status.setAttribute("data-id", channelID);
  channel_name.setAttribute("data-id", channelID);

  channel_wrap_button.setAttribute("data-status", isPublic);
  channel_status.setAttribute("data-status", isPublic);
  channel_name.setAttribute("data-status", isPublic);

  channel_wrap_button.addEventListener("click", selectChannelHandler);
  channelContainer.appendChild(clone);
  /* console.log("channelwrap: ", channel_wrap_button); */
};

const buildMessageChatViaTemplate = (text, timeStamp, username) => {
  const messageContainer = document.querySelector(".messageContainer");
  const template = document.querySelector("#messageTemplate");
  const clone = template.content.cloneNode(true);
  const message_text = clone.querySelector(".message");
  const username_text = clone.querySelector(".username");
  const message_timestamp = clone.querySelector(".timeStamp");

  message_text.innerText = ": " + text;
  username_text.innerText = username;
  message_timestamp.innerText = timeStamp;
  messageContainer.appendChild(clone);
};

const logout = () => {
  localStorage.removeItem("jwt");
  currentUser = null;
  changeTextAndHideInputs(null);
  // Se till att den säger "guest" istället för null samt ändrar tillbaka så inloggning är möjligt.
};

document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".logout").addEventListener("click", logout);
});

window.addEventListener("load", () => {
  console.log("ON LOAD");
  /* verifyToken(nameToken); */
  fetchChannelsFromServer();
});
