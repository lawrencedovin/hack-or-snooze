$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $favoritedArticles = $("#favorited-articles");
  const $myArticles = $("#my-articles");
  const $filteredArticles = $("#filtered-articles");

  const $submitForm = $("#submit-form");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");

  const $ownStories = $("#my-articles");

  const $navAll = $("#nav-all");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navSubmit = $("#nav-submit");
  const $navWelcome = $("#nav-welcome");
  const $navUserProfile = $("#nav-user-profile");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  $submitForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab all the info from the form
    const $title = $("#title").val();
    const $url = $("#url").val();
    const $author = $("#author").val();
    $submitForm.trigger("reset");
    const story = await storyList.addStory(currentUser, {
      author: $author,
      title: $title,
      url: $url,
    });
    // Adds the new story to top of story list in the view
    $allStoriesList.prepend(generateStoryHTML(story));
  });

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  $navSubmit.on("click", function () {
    $submitForm.slideToggle();
  });

  /**
   * Favorite Button Functionality
   */

  $("body").on("click", ".favorite-button", async function () {
    const $storyId = $(this).parent().attr("id");
    $(this).toggleClass("far");
    $(this).toggleClass("fas");
    $(this).hasClass("far") ? await currentUser.removeFavoriteStory($storyId) : await currentUser.addFavoriteStory($storyId);
  });

  /**
   * Remove Own Story Button Functionality
   */

  $("body").on("click", ".remove-button", async function () {
    const $storyContainer = $(this).parent();
    const $storyId = $storyContainer.attr("id");
    await currentUser.removeOwnStory($storyId);
    $storyContainer.remove();
  });

  /**
   * Event handler for Navigation Views
   */

  function navShowStories(htmlSection, generateStoriesFunc) {
    hideElements();
    htmlSection.empty();
    generateStoriesFunc();
    htmlSection.show();
  }

  /**
   * Event handler for Navigation to Homepage
   */

  $navAll.on("click", function () {
    navShowStories($allStoriesList, generateStories);
  });

  /**
   * Event handler for Navigation to Favorite Stories
   */

  $navFavorites.on("click", function () {
    navShowStories($favoritedArticles, generateFavoriteStories);
  });

  /**
   * Event handler for Navigation to My Stories
   */

  $navMyStories.on("click", function () {
    navShowStories($myArticles, generateOwnStories);
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  async function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
    location.reload();
  }

  /**
   * Function for looping through stories depending on type of story and
   *  story HTML Section
   */

  function loopStories(storyArray, htmlSection) {
    for (let story of storyArray) {
      const result = generateStoryHTML(story);
      htmlSection.append(result);
    }
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    loopStories(storyList.stories, $allStoriesList);
  }

  function generateFavoriteStories() {
    loopStories(currentUser.favorites, $favoritedArticles);
  }

  function generateOwnStories() {
    loopStories(currentUser.ownStories, $myArticles);
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    let showTrashIcon = `<i class="fa fa-trash remove-button"></i>`
    let showIcons;
    
    if(currentUser) {
      $myArticles.has("li").length === 0
      ? showIcons = `<i class="${currentUser.checkFavorite(story.storyId)} fa-star favorite-button"></i>`
      : showIcons = showTrashIcon + `<i class="${currentUser.checkFavorite(story.storyId)} fa-star favorite-button"></i>`;
    }
    else showIcons = `<i></i>`;
    
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      ${showIcons}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }


  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      [
        $submitForm,
        $loginForm,
        $createAccountForm,
      ],
      [
        $allStoriesList,
        $favoritedArticles,
        $myArticles,
        $filteredArticles,
        $ownStories,
      ],
    ];

    [forms, views] = [elementsArr[0], elementsArr[1]];
    forms.concat(views).forEach(($elem) => $elem.hide());
    views.forEach(($elem) => $elem.empty());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navWelcome.show();
    // Changes user profile text to the logged in user in the welcome screen
    setTimeout($($navUserProfile).text(localStorage.getItem("username")), 10);
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});