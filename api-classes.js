const BASE_URL = 'https://hack-or-snooze-v3.herokuapp.com';

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
	constructor(stories) {
		this.stories = stories;
	}

	/**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

	// TODO: Note the presence of `static` keyword: this indicates that getStories
	// is **not** an instance method. Rather, it is a method that is called on the
	// class directly. Why doesn't it make sense for getStories to be an instance method?

	static async getStories() {
		const response = await axios.get(`${BASE_URL}/stories`);
		// get request for stories from API

		const stories = response.data.stories.map((story) => new Story(story));
		// map requested stories data to a new story class

		const storyList = new StoryList(stories);
		return storyList;
	}

	/**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

	async addStory(user, newStory) {
		const response = await axios({
			method: 'POST',
			url: `${BASE_URL}/stories`,
			data: {
				// request body
				// this is the format specified by the API
				token: user.loginToken,
				story: newStory
			}
		});

		newStory = new Story(response.data.story);
		//makes a story class from the response data
		this.stories.unshift(newStory);
		// adds story to start of list
		user.ownStories.unshift(newStory);
		//also adds the story to ownStories

		return newStory;
	}

	/**
   * Method to make a DELETE request to remove a particular story
   *  and also update the StoryList
   *
   * - user: the current User instance
   * - storyId: the ID of the story you want to remove
   */

	async removeStory(user, storyId) {
		await axios({
			method: 'DELETE',
			url: `${BASE_URL}/stories/${storyId}`,
			data: {
				token: user.loginToken
			}
		});

		this.stories = this.stories.filter((story) => story.storyId !== storyId);
		// filter for story which matches id

		user.ownStories = user.ownStories.filter((s) => s.storyId !== storyId);
	}
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
	constructor(userObj) {
		this.username = userObj.username;
		this.name = userObj.name;
		this.createdAt = userObj.createdAt;
		this.updatedAt = userObj.updatedAt;

		// these are all set to defaults, not passed in by the constructor
		this.loginToken = '';
		this.favorites = [];
		this.ownStories = [];
	}

	/* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

	static async create(username, password, name) {
		const response = await axios.post(`${BASE_URL}/signup`, {
			user: {
				username,
				password,
				name
			}
		});

		// build a new User instance from the API response
		const newUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		newUser.loginToken = response.data.token;

		return newUser;
	}

	/* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

	static async login(username, password) {
		const response = await axios.post(`${BASE_URL}/login`, {
			user: {
				username,
				password
			}
		});

		// build a new User instance from the API response
		const existingUser = new User(response.data.user);

		// instantiate Story instances for the user's favorites and ownStories
		existingUser.favorites = response.data.user.favorites.map((s) => new Story(s));
		existingUser.ownStories = response.data.user.stories.map((s) => new Story(s));

		// attach the token to the newUser instance for convenience
		existingUser.loginToken = response.data.token;

		return existingUser;
	}

	/** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

	static async getLoggedInUser(token, username) {
		// if we don't have user info, return null
		if (!token || !username) return null;

		// call the API
		const response = await axios.get(`${BASE_URL}/users/${username}`, {
			params: { token }
		});

		// instantiate the user from the API information
		const existingUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		existingUser.loginToken = token;

		// instantiate Story instances for the user's favorites and ownStories
		existingUser.favorites = response.data.user.favorites.map((s) => new Story(s));
		existingUser.ownStories = response.data.user.stories.map((s) => new Story(s));

		return existingUser;
	}

	/**
   * This function fetches user information from the API
   *  at /users/{username} using a token. Then it sets all the
   *  appropriate instance properties from the response with the current user instance.
   */

	async getProfile() {
		const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
			params: {
				token: this.loginToken
			}
		});

		this.name = response.data.user.name;
		this.createdAt = response.data.user.createdAt;
		this.updatedAt = response.data.user.updatedAt;
		// change the profile information based on user data

		this.favorites = response.data.user.favorites.map((s) => new Story(s));
		// map users favorites to new story
		this.ownStories = response.data.user.stories.map((s) => new Story(s));
		// maps users own stories to new story

		return this;
	}

	addFavorite(storyId) {
		return this._toggleFavorite(storyId, 'POST');
	}
	// adds a story to favorites based on ID

	removeFavorite(storyId) {
		return this._toggleFavorite(storyId, 'DELETE');
	}
	// deletes a story from favorites based on ID

	async _toggleFavorite(storyId, httpVerb) {
		await axios({
			url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
			method: httpVerb,
			data: {
				token: this.loginToken
			}
		});

		await this.getProfile();
		return this;
	}
}

/**
 * Class to represent a single story.
 */

class Story {
	/**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

	constructor(storyObj) {
		this.author = storyObj.author;
		this.title = storyObj.title;
		this.url = storyObj.url;
		this.username = storyObj.username;
		this.storyId = storyObj.storyId;
		this.createdAt = storyObj.createdAt;
		this.updatedAt = storyObj.updatedAt;
	}
}
