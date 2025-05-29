// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";


// --- Global Variables (Provided by Canvas Environment) ---
// __app_id: The current app ID
// __firebase_config: Firebase configuration as a JSON string
// __initial_auth_token: Firebase custom auth token for initial sign-in

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- UI Elements ---
const authModal = document.getElementById('auth-modal');
const authTitle = document.getElementById('auth-title');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authSubmitButton = document.getElementById('auth-submit-button');
const toggleAuthModeButton = document.getElementById('toggle-auth-mode');
const authErrorDiv = document.getElementById('auth-error');
const closeAuthModalButton = document.getElementById('close-auth-modal');

const messageModal = document.getElementById('message-modal');
const messageText = document.getElementById('message-text');
const messageOkButton = document.getElementById('message-ok-button');
const closeMessageModalButton = document.getElementById('close-message-modal');

const commentsModal = document.getElementById('comments-modal');
const commentsList = document.getElementById('comments-list');
const commentInput = document.getElementById('comment-input');
const postCommentButton = document.getElementById('post-comment-button');
const closeCommentsModalButton = document.getElementById('close-comments-modal');

const authStatusDiv = document.getElementById('auth-status');
const mainContent = document.getElementById('main-content');
const navHomeButton = document.getElementById('nav-home');
const navSearchButton = document.getElementById('nav-search');
const navUploadButton = document.getElementById('nav-upload');
const navProfileButton = document.getElementById('nav-profile');

const videoFeedSection = document.getElementById('video-feed-section');
const videoFeedContainer = document.getElementById('video-feed');
const uploadSection = document.getElementById('upload-section');
const videoFileInput = document.getElementById('video-file-input');
const videoDescriptionInput = document.getElementById('video-description-input');
const uploadVideoButton = document.getElementById('upload-video-button');
const uploadStatusDiv = document.getElementById('upload-status');

const profileSection = document.getElementById('profile-section');
const profileEmail = document.getElementById('profile-email');
const profileUid = document.getElementById('profile-uid');
const bioInput = document.getElementById('bio-input');
const saveBioButton = document.getElementById('save-bio-button');
const bioStatusDiv = document.getElementById('bio-status');
const uploadedVideosGrid = document.getElementById('uploaded-videos-grid');
const signOutButton = document.getElementById('sign-out-button');

const searchSection = document.getElementById('search-section');
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const searchResultsDiv = document.getElementById('search-results');

// --- State Variables ---
let currentUserId = null;
let currentUserEmail = null;
let isRegisterMode = false;
let currentPlayingVideo = null;
let currentVideoIdForComments = null; // To track which video's comments are open

// --- Utility Functions ---

/**
 * Displays a custom message modal.
 * @param {string} message - The message to display.
 * @param {function} [callback] - Optional callback function to execute when OK is clicked.
 */
function showMessage(message, callback = null) {
    messageText.textContent = message;
    messageModal.classList.remove('hidden');
    messageOkButton.onclick = () => {
        messageModal.classList.add('hidden');
        if (callback) callback();
    };
    closeMessageModalButton.onclick = () => {
        messageModal.classList.add('hidden');
        if (callback) callback();
    };
}

/**
 * Hides all main content sections.
 */
function hideAllSections() {
    videoFeedSection.classList.add('hidden');
    uploadSection.classList.add('hidden');
    profileSection.classList.add('hidden');
    searchSection.classList.add('hidden');
}

/**
 * Navigates to a specific section of the app.
 * @param {string} sectionId - The ID of the section to show.
 */
function navigateTo(sectionId) {
    hideAllSections();
    document.getElementById(sectionId).classList.remove('hidden');

    // Pause current playing video when navigating away from feed
    if (sectionId !== 'video-feed-section' && currentPlayingVideo) {
        currentPlayingVideo.pause();
    }
    if (sectionId === 'video-feed-section') {
        // Attempt to play the first video or resume if available
        const firstVideoElement = videoFeedContainer.querySelector('video');
        if (firstVideoElement) {
            firstVideoElement.play().catch(e => console.warn("Autoplay prevented:", e));
            currentPlayingVideo = firstVideoElement;
        }
    }
    if (sectionId === 'profile-section' && currentUserId) {
        updateUserProfileUI();
    }
}

/**
 * Toggles the authentication mode between login and register.
 */
function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    authTitle.textContent = isRegisterMode ? 'Register' : 'Login';
    authSubmitButton.textContent = isRegisterMode ? 'Register' : 'Login';
    toggleAuthModeButton.textContent = isRegisterMode ? "Already have an account? Login" : "Don't have an account? Register";
    authErrorDiv.classList.add('hidden');
    authEmailInput.value = '';
    authPasswordInput.value = '';
}

/**
 * Handles user authentication (login or register) and creates/updates user profile.
 */
async function handleAuth() {
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    authErrorDiv.classList.add('hidden'); // Hide previous errors

    if (!email || !password) {
        authErrorDiv.textContent = 'Please enter both email and password.';
        authErrorDiv.classList.remove('hidden');
        return;
    }

    try {
        let userCredential;
        if (isRegisterMode) {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            showMessage('Registration successful! You are now logged in.');
        } else {
            userCredential = await signInWithEmailAndPassword(auth, email, password);
            showMessage('Login successful!');
        }

        // Create or update user profile in Firestore
        const user = userCredential.user;
        const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
        await setDoc(userDocRef, {
            email: user.email,
            uid: user.uid,
            bio: '', // Initialize bio
            createdAt: serverTimestamp()
        }, { merge: true }); // Merge to update if exists, create if not

        authModal.classList.add('hidden'); // Hide modal on success
    } catch (error) {
        console.error("Authentication error:", error);
        let errorMessage = 'An unknown error occurred.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already in use.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password sign-in is not enabled.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak (min 6 characters).';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Invalid email or password.';
                break;
            default:
                errorMessage = `Error: ${error.message}`;
        }
        authErrorDiv.textContent = errorMessage;
        authErrorDiv.classList.remove('hidden');
    }
}

/**
 * Signs out the current user.
 */
async function handleSignOut() {
    try {
        await signOut(auth);
        showMessage('You have been signed out.');
        // UI will be updated by onAuthStateChanged listener
    } catch (error) {
        console.error("Error signing out:", error);
        showMessage('Failed to sign out. Please try again.');
    }
}

/**
 * Updates the user profile UI elements and fetches uploaded videos.
 */
async function updateUserProfileUI() {
    if (!currentUserId) {
        profileEmail.textContent = 'Email: N/A';
        profileUid.textContent = 'User ID: N/A';
        bioInput.value = '';
        uploadedVideosGrid.innerHTML = '<p class="text-gray-500 text-center col-span-2">Please log in to view your profile.</p>';
        return;
    }

    profileEmail.textContent = `Email: ${currentUserEmail || 'N/A'}`;
    profileUid.textContent = `User ID: ${currentUserId}`;

    // Fetch user bio
    const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUserId);
    try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            bioInput.value = userDocSnap.data().bio || '';
        } else {
            bioInput.value = '';
        }
    } catch (error) {
        console.error("Error fetching user bio:", error);
        bioInput.value = 'Error loading bio.';
    }

    // Fetch and display uploaded videos
    uploadedVideosGrid.innerHTML = '<p class="text-gray-500 text-center col-span-2">Loading your videos...</p>';
    try {
        const q = query(collection(db, `artifacts/${appId}/public/data/videos`), where("userId", "==", currentUserId));
        const querySnapshot = await getDocs(q);

        uploadedVideosGrid.innerHTML = ''; // Clear previous content
        if (querySnapshot.empty) {
            uploadedVideosGrid.innerHTML = '<p class="text-gray-500 text-center col-span-2">You haven\'t uploaded any videos yet.</p>';
        } else {
            querySnapshot.forEach((doc) => {
                const videoData = { id: doc.id, ...doc.data() };
                const videoCard = document.createElement('div');
                videoCard.className = 'relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-lg transition duration-300 ease-in-out';
                videoCard.innerHTML = `
                    <video src="${videoData.videoUrl}" class="w-full h-32 object-cover rounded-lg"></video>
                    <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <i class="fas fa-play text-white text-3xl"></i>
                    </div>
                    <p class="p-2 text-sm text-gray-700 truncate">${videoData.description}</p>
                `;
                // Add click listener to play video in a larger view if needed (not implemented in this example)
                // videoCard.addEventListener('click', () => showMessage(`Playing: ${videoData.description}`));
                uploadedVideosGrid.appendChild(videoCard);
            });
        }
    } catch (error) {
        console.error("Error fetching uploaded videos:", error);
        uploadedVideosGrid.innerHTML = '<p class="text-red-500 text-center col-span-2">Error loading your videos.</p>';
    }
}

/**
 * Saves the user's bio to Firestore.
 */
async function saveBio() {
    if (!currentUserId) {
        showMessage('Please log in to save your bio.');
        return;
    }

    const bioText = bioInput.value.trim();
    const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, currentUserId);
    bioStatusDiv.textContent = 'Saving...';

    try {
        await updateDoc(userDocRef, { bio: bioText });
        bioStatusDiv.textContent = 'Bio saved successfully!';
        setTimeout(() => bioStatusDiv.textContent = '', 3000); // Clear status after 3 seconds
    } catch (error) {
        console.error("Error saving bio:", error);
        bioStatusDiv.textContent = 'Failed to save bio.';
        showMessage('Failed to save bio. Please try again.');
    }
}


/**
 * Creates a video element for the feed.
 * @param {object} videoData - The video document data from Firestore.
 * @param {string} videoData.id - The Firestore document ID (video ID).
 * @param {string} videoData.videoUrl - The URL of the video.
 * @param {string} videoData.description - The video description.
 * @param {string} videoData.userId - The ID of the user who uploaded the video.
 * @param {number} videoData.likesCount - Number of likes.
 * @param {number} videoData.commentsCount - Number of comments.
 * @param {number} videoData.savesCount - Number of saves.
 * @returns {HTMLElement} The created video card element.
 */
function createVideoCard(videoData) {
    const videoCard = document.createElement('div');
    videoCard.id = `video-${videoData.id}`;
    videoCard.className = 'video-card relative w-full h-full flex-shrink-0 snap-center bg-black rounded-xl overflow-hidden';
    videoCard.style.height = 'calc(100vh - 100px)'; // Match main content height

    videoCard.innerHTML = `
        <video class="video-player" loop muted playsinline preload="auto">
            <source src="${videoData.videoUrl}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="absolute bottom-4 left-4 text-white p-2 rounded-lg bg-gradient-to-t from-black/50 to-transparent w-3/4">
            <p class="font-bold text-lg mb-1">@${videoData.userId.substring(0, 8)}...</p>
            <p class="text-sm">${videoData.description}</p>
        </div>
        <div class="absolute bottom-4 right-4 flex flex-col space-y-4">
            <button class="icon-button like-button" data-video-id="${videoData.id}">
                <i class="fas fa-heart"></i>
                <span class="like-count">${videoData.likesCount || 0}</span>
            </button>
            <button class="icon-button comment-button" data-video-id="${videoData.id}">
                <i class="fas fa-comment-dots"></i>
                <span class="comment-count">${videoData.commentsCount || 0}</span>
            </button>
            <button class="icon-button save-button" data-video-id="${videoData.id}">
                <i class="fas fa-bookmark"></i>
                <span class="save-count">${videoData.savesCount || 0}</span>
            </button>
        </div>
    `;

    const videoElement = videoCard.querySelector('video');
    const likeButton = videoCard.querySelector('.like-button');
    const commentButton = videoCard.querySelector('.comment-button');
    const saveButton = videoCard.querySelector('.save-button');

    // Event listeners for interactions
    likeButton.addEventListener('click', () => handleLike(videoData.id, currentUserId, likeButton));
    commentButton.addEventListener('click', () => openCommentsModal(videoData.id));
    saveButton.addEventListener('click', () => handleSave(videoData.id, currentUserId, saveButton));

    // Autoplay/pause on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                videoElement.play().catch(e => console.warn("Autoplay prevented:", e));
                currentPlayingVideo = videoElement;
            } else {
                videoElement.pause();
            }
        });
    }, { threshold: 0.75 }); // Play when 75% of the video is visible
    observer.observe(videoCard);

    return videoCard;
}

/**
 * Fetches and displays videos from Firestore.
 * Uses onSnapshot for real-time updates.
 */
function fetchVideos() {
    // Clear existing videos to prevent duplicates on re-render
    videoFeedContainer.innerHTML = '<div class="text-center p-4 text-gray-500">Loading videos...</div>';

    const videosCollectionRef = collection(db, `artifacts/${appId}/public/data/videos`);

    // Listen for real-time updates to the videos collection
    onSnapshot(videosCollectionRef, (snapshot) => {
        // Clear the container before adding new videos to avoid duplicates
        videoFeedContainer.innerHTML = '';
        if (snapshot.empty) {
            videoFeedContainer.innerHTML = '<div class="text-center p-4 text-gray-500">No videos uploaded yet. Be the first!</div>';
            return;
        }

        const videos = [];
        snapshot.forEach(doc => {
            videos.push({ id: doc.id, ...doc.data() });
        });

        // Sort videos by timestamp (most recent first)
        videos.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));

        videos.forEach(videoData => {
            const videoCard = createVideoCard(videoData);
            videoFeedContainer.appendChild(videoCard);
        });

        // Ensure the first video plays if available
        const firstVideoElement = videoFeedContainer.querySelector('video');
        if (firstVideoElement && videoFeedSection.classList.contains('hidden') === false) {
            firstVideoElement.play().catch(e => console.warn("Autoplay prevented:", e));
            currentPlayingVideo = firstVideoElement;
        }
    }, (error) => {
        console.error("Error fetching videos:", error);
        videoFeedContainer.innerHTML = '<div class="text-center p-4 text-red-500">Error loading videos.</div>';
    });
}

/**
 * Handles video upload to Firebase Storage and metadata to Firestore.
 */
async function handleVideoUpload() {
    if (!currentUserId) {
        showMessage('Please log in to upload videos.');
        return;
    }

    const videoFile = videoFileInput.files[0];
    const description = videoDescriptionInput.value.trim();

    if (!videoFile) {
        showMessage('Please select a video file.');
        return;
    }
    if (!description) {
        showMessage('Please add a video description.');
        return;
    }

    uploadStatusDiv.textContent = 'Uploading...';
    uploadVideoButton.disabled = true;

    try {
        // 1. Upload video to Firebase Storage
        const storageRef = ref(storage, `artifacts/${appId}/public/videos/${currentUserId}/${videoFile.name}_${Date.now()}`);
        const uploadTask = uploadBytesResumable(storageRef, videoFile);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                uploadStatusDiv.textContent = `Upload is ${progress.toFixed(2)}% done`;
            },
            (error) => {
                console.error("Upload error:", error);
                uploadStatusDiv.textContent = `Upload failed: ${error.message}`;
                showMessage(`Video upload failed: ${error.message}`);
                uploadVideoButton.disabled = false;
            },
            async () => {
                // 2. Get download URL
                const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);

                // 3. Save video metadata to Firestore
                const videosCollectionRef = collection(db, `artifacts/${appId}/public/data/videos`);
                await addDoc(videosCollectionRef, {
                    userId: currentUserId,
                    videoUrl: videoUrl,
                    description: description,
                    likesCount: 0,
                    commentsCount: 0,
                    savesCount: 0,
                    timestamp: serverTimestamp()
                });

                uploadStatusDiv.textContent = 'Upload successful!';
                showMessage('Video uploaded successfully!');
                videoFileInput.value = ''; // Clear file input
                videoDescriptionInput.value = ''; // Clear description
                uploadVideoButton.disabled = false;
                navigateTo('video-feed-section'); // Go back to feed after upload
            }
        );

    } catch (error) {
        console.error("Error uploading video:", error);
        uploadStatusDiv.textContent = `Error: ${error.message}`;
        showMessage(`Error uploading video: ${error.message}`);
        uploadVideoButton.disabled = false;
    }
}

/**
 * Handles liking/unliking a video.
 * @param {string} videoId - The ID of the video.
 * @param {string} userId - The ID of the current user.
 * @param {HTMLElement} likeButton - The like button element.
 */
async function handleLike(videoId, userId, likeButton) {
    if (!userId) {
        showMessage('Please log in to like videos.');
        return;
    }

    const videoRef = doc(db, `artifacts/${appId}/public/data/videos`, videoId);
    const userLikeRef = doc(db, `artifacts/${appId}/users/${userId}/likedVideos`, videoId); // Private user likes

    try {
        const likeDoc = await getDoc(userLikeRef);
        const isLiked = likeDoc.exists();
        const likeCountSpan = likeButton.querySelector('.like-count');
        let currentLikes = parseInt(likeCountSpan.textContent);

        if (isLiked) {
            // Unlike
            await deleteDoc(userLikeRef);
            await updateDoc(videoRef, {
                likesCount: Math.max(0, currentLikes - 1) // Ensure it doesn't go below 0
            });
            likeButton.classList.remove('text-red-500'); // Remove highlight
            likeCountSpan.textContent = Math.max(0, currentLikes - 1);
        } else {
            // Like
            await setDoc(userLikeRef, { likedAt: serverTimestamp() });
            await updateDoc(videoRef, {
                likesCount: currentLikes + 1
            });
            likeButton.classList.add('text-red-500'); // Add highlight
            likeCountSpan.textContent = currentLikes + 1;
        }
    } catch (error) {
        console.error("Error handling like:", error);
        showMessage('Failed to update like status. Please try again.');
    }
}

/**
 * Handles saving/unsaving a video.
 * @param {string} videoId - The ID of the video.
 * @param {string} userId - The ID of the current user.
 * @param {HTMLElement} saveButton - The save button element.
 */
async function handleSave(videoId, userId, saveButton) {
    if (!userId) {
        showMessage('Please log in to save videos.');
        return;
    }

    const videoRef = doc(db, `artifacts/${appId}/public/data/videos`, videoId);
    const userSaveRef = doc(db, `artifacts/${appId}/users/${userId}/savedVideos`, videoId); // Private user saves

    try {
        const saveDoc = await getDoc(userSaveRef);
        const isSaved = saveDoc.exists();
        const saveCountSpan = saveButton.querySelector('.save-count');
        let currentSaves = parseInt(saveCountSpan.textContent);

        if (isSaved) {
            // Unsave
            await deleteDoc(userSaveRef);
            await updateDoc(videoRef, {
                savesCount: Math.max(0, currentSaves - 1)
            });
            saveButton.classList.remove('text-blue-500'); // Remove highlight
            saveCountSpan.textContent = Math.max(0, currentSaves - 1);
        } else {
            // Save
            await setDoc(userSaveRef, { savedAt: serverTimestamp() });
            await updateDoc(videoRef, {
                savesCount: currentSaves + 1
            });
            saveButton.classList.add('text-blue-500'); // Add highlight
            saveCountSpan.textContent = currentSaves + 1;
        }
    } catch (error) {
        console.error("Error handling save:", error);
        showMessage('Failed to update save status. Please try again.');
    }
}

/**
 * Opens the comments modal for a specific video.
 * @param {string} videoId - The ID of the video to show comments for.
 */
async function openCommentsModal(videoId) {
    if (!currentUserId) {
        showMessage('Please log in to view and post comments.');
        return;
    }
    currentVideoIdForComments = videoId;
    commentsList.innerHTML = '<p class="text-gray-500 text-center">Loading comments...</p>';
    commentsModal.classList.remove('hidden');

    const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/videos/${videoId}/comments`);

    // Listen for real-time updates to comments
    onSnapshot(commentsCollectionRef, (snapshot) => {
        commentsList.innerHTML = ''; // Clear existing comments
        if (snapshot.empty) {
            commentsList.innerHTML = '<p class="text-gray-500 text-center">No comments yet. Be the first!</p>';
            return;
        }

        const comments = [];
        snapshot.forEach(doc => {
            comments.push({ id: doc.id, ...doc.data() });
        });

        // Sort comments by timestamp (most recent first)
        comments.sort((a, b) => (a.timestamp?.toDate() || 0) - (b.timestamp?.toDate() || 0));

        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'mb-2 p-2 bg-gray-50 rounded-md';
            commentElement.innerHTML = `
                <p class="font-semibold text-sm text-gray-800">@${comment.userId.substring(0, 8)}...</p>
                <p class="text-gray-700 text-sm">${comment.text}</p>
                <span class="text-xs text-gray-400">${comment.timestamp ? new Date(comment.timestamp.toDate()).toLocaleString() : 'Just now'}</span>
            `;
            commentsList.appendChild(commentElement);
        });
        commentsList.scrollTop = commentsList.scrollHeight; // Scroll to bottom
    }, (error) => {
        console.error("Error fetching comments:", error);
        commentsList.innerHTML = '<p class="text-red-500 text-center">Error loading comments.</p>';
    });
}

/**
 * Posts a new comment to the current video.
 */
async function postComment() {
    if (!currentUserId || !currentVideoIdForComments) {
        showMessage('Error: User not logged in or video not selected.');
        return;
    }

    const commentText = commentInput.value.trim();
    if (!commentText) {
        showMessage('Please enter a comment.');
        return;
    }

    try {
        const commentsCollectionRef = collection(db, `artifacts/${appId}/public/data/videos/${currentVideoIdForComments}/comments`);
        await addDoc(commentsCollectionRef, {
            userId: currentUserId,
            text: commentText,
            timestamp: serverTimestamp()
        });

        // Update comments count on the video document
        const videoRef = doc(db, `artifacts/${appId}/public/data/videos`, currentVideoIdForComments);
        const videoDoc = await getDoc(videoRef);
        const currentCommentsCount = videoDoc.exists() ? (videoDoc.data().commentsCount || 0) : 0;
        await updateDoc(videoRef, {
            commentsCount: currentCommentsCount + 1
        });

        commentInput.value = ''; // Clear input
    } catch (error) {
        console.error("Error posting comment:", error);
        showMessage('Failed to post comment. Please try again.');
    }
}

/**
 * Performs a search for videos by description and users by email.
 */
async function searchVideos() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    searchResultsDiv.innerHTML = '<p class="text-gray-500 text-center">Searching...</p>';

    if (!searchTerm) {
        searchResultsDiv.innerHTML = '<p class="text-gray-500 text-center">Please enter a search term.</p>';
        return;
    }

    let resultsHtml = '';

    // --- Search Videos ---
    try {
        const videosCollectionRef = collection(db, `artifacts/${appId}/public/data/videos`);
        const videoQuerySnapshot = await getDocs(videosCollectionRef); // Fetch all for client-side filter

        const allVideos = [];
        videoQuerySnapshot.forEach(doc => {
            allVideos.push({ id: doc.id, ...doc.data() });
        });

        const filteredVideos = allVideos.filter(video =>
            video.description && video.description.toLowerCase().includes(searchTerm)
        );

        if (filteredVideos.length > 0) {
            resultsHtml += '<h3 class="text-xl font-semibold mb-3 text-gray-800">Videos:</h3>';
            filteredVideos.forEach(videoData => {
                resultsHtml += `
                    <div class="flex items-center p-3 mb-2 bg-white rounded-lg shadow-sm">
                        <video src="${videoData.videoUrl}" class="w-20 h-20 object-cover rounded-md mr-3" controls muted></video>
                        <div>
                            <p class="font-semibold text-gray-800">${videoData.description}</p>
                            <p class="text-sm text-gray-600">Uploaded by @${videoData.userId.substring(0, 8)}...</p>
                        </div>
                    </div>
                `;
            });
        } else {
            resultsHtml += '<p class="text-gray-500 text-center mb-4">No videos found matching your search.</p>';
        }
    } catch (error) {
        console.error("Error searching videos:", error);
        resultsHtml += '<p class="text-red-500 text-center mb-4">Error searching videos.</p>';
    }

    // --- Search Accounts ---
    try {
        const usersCollectionRef = collection(db, `artifacts/${appId}/public/data/users`);
        const userQuerySnapshot = await getDocs(usersCollectionRef);

        const allUsers = [];
        userQuerySnapshot.forEach(doc => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });

        const filteredUsers = allUsers.filter(user =>
            user.email && user.email.toLowerCase().includes(searchTerm)
        );

        if (filteredUsers.length > 0) {
            resultsHtml += '<h3 class="text-xl font-semibold mt-6 mb-3 text-gray-800">Accounts:</h3>';
            filteredUsers.forEach(userData => {
                resultsHtml += `
                    <div class="flex items-center p-3 mb-2 bg-white rounded-lg shadow-sm">
                        <i class="fas fa-user-circle text-4xl text-gray-400 mr-3"></i>
                        <div>
                            <p class="font-semibold text-gray-800">${userData.email}</p>
                            <p class="text-sm text-gray-600">${userData.bio || 'No bio yet.'}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            resultsHtml += '<p class="text-gray-500 text-center mt-4">No accounts found matching your search.</p>';
        }
    } catch (error) {
        console.error("Error searching accounts:", error);
        resultsHtml += '<p class="text-red-500 text-center mt-4">Error searching accounts.</p>';
    }

    searchResultsDiv.innerHTML = resultsHtml || '<p class="text-gray-500 text-center">No results found for your search.</p>';
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial authentication check
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // User is signed in
            currentUserId = user.uid;
            currentUserEmail = user.email;
            authStatusDiv.textContent = `Logged in as: ${user.email || user.uid}`;
            authModal.classList.add('hidden'); // Hide auth modal if already logged in
            navigateTo('video-feed-section'); // Go to video feed
            fetchVideos(); // Start fetching videos

            // Ensure user profile exists in public/data/users
            const userDocRef = doc(db, `artifacts/${appId}/public/data/users`, user.uid);
            await setDoc(userDocRef, {
                email: user.email,
                uid: user.uid,
                // bio field will be added/merged if it doesn't exist
            }, { merge: true });

        } else {
            // User is signed out
            currentUserId = null;
            currentUserEmail = null;
            authStatusDiv.textContent = 'Not logged in';
            authModal.classList.remove('hidden'); // Show auth modal
            hideAllSections(); // Hide all content sections
        }

        // If an initial custom auth token is provided, attempt to sign in with it
        // This ensures the Canvas environment's auth is used if available.
        if (initialAuthToken && !user) { // Only try if token exists and no user is currently signed in
            try {
                await signInWithCustomToken(auth, initialAuthToken);
                console.log("Signed in with custom token.");
            } catch (error) {
                console.error("Error signing in with custom token:", error);
                // Fallback to anonymous sign-in if custom token fails or is not provided
                // This ensures there's always a user context for Firestore rules
                try {
                    await signInAnonymously(auth);
                    console.log("Signed in anonymously.");
                } catch (anonError) {
                    console.error("Error signing in anonymously:", anonError);
                    showMessage("Authentication failed. Please refresh the page.");
                }
            }
        } else if (!user) { // If no custom token and no user, sign in anonymously
            try {
                await signInAnonymously(auth);
                console.log("Signed in anonymously.");
            } catch (anonError) {
                console.error("Error signing in anonymously:", anonError);
                showMessage("Authentication failed. Please refresh the page.");
            }
        }
    });

    // Auth Modal Listeners
    toggleAuthModeButton.addEventListener('click', toggleAuthMode);
    authSubmitButton.addEventListener('click', handleAuth);
    closeAuthModalButton.addEventListener('click', () => {
        // Only allow closing if a user is logged in (e.g., anonymous user)
        if (currentUserId) {
            authModal.classList.add('hidden');
        } else {
            showMessage("Please log in or register to use the app.");
        }
    });

    // Message Modal Listeners
    messageOkButton.addEventListener('click', () => messageModal.classList.add('hidden'));
    closeMessageModalButton.addEventListener('click', () => messageModal.classList.add('hidden'));

    // Comments Modal Listeners
    closeCommentsModalButton.addEventListener('click', () => commentsModal.classList.add('hidden'));
    postCommentButton.addEventListener('click', postComment);
    commentInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            postComment();
        }
    });

    // Navigation Listeners
    navHomeButton.addEventListener('click', () => navigateTo('video-feed-section'));
    navUploadButton.addEventListener('click', () => {
        if (currentUserId) {
            navigateTo('upload-section');
        } else {
            showMessage('Please log in to upload videos.');
        }
    });
    navProfileButton.addEventListener('click', () => {
        if (currentUserId) {
            navigateTo('profile-section');
        } else {
            showMessage('Please log in to view your profile.');
        }
    });
    navSearchButton.addEventListener('click', () => navigateTo('search-section'));

    // Upload Section Listeners
    uploadVideoButton.addEventListener('click', handleVideoUpload);

    // Profile Section Listeners
    saveBioButton.addEventListener('click', saveBio);
    signOutButton.addEventListener('click', handleSignOut);

    // Search Section Listeners
    searchButton.addEventListener('click', searchVideos);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchVideos();
        }
    });

    // Handle video autoplay/pause on scroll for the main feed
    videoFeedContainer.addEventListener('scroll', () => {
        const videoCards = videoFeedContainer.querySelectorAll('.video-card');
        videoCards.forEach(card => {
            const video = card.querySelector('video');
            if (!video) return;

            const rect = card.getBoundingClientRect();
            const containerRect = videoFeedContainer.getBoundingClientRect();

            // Check if the video card is significantly visible within the feed container
            const isVisible = (
                rect.top >= containerRect.top &&
                rect.bottom <= containerRect.bottom &&
                rect.height > 0 // Ensure element has height
            );

            if (isVisible) {
                video.play().catch(e => console.warn("Autoplay prevented:", e));
                currentPlayingVideo = video;
            } else {
                video.pause();
            }
        });
    });
});
