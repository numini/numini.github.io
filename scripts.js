function search() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();

  // Cek apakah kotak pencarian kosong
  if (searchTerm === '') {
    alert('Masukkan kata kunci pencarian.');
    return;  // Berhenti jika kotak pencarian kosong
  }

  const posts = document.querySelectorAll('.post');

  posts.forEach(post => {
    post.classList.remove('visible');

    const postTags = post.getAttribute('data-tags').toLowerCase();
    if (postTags.includes(searchTerm)) {
      post.classList.add('visible');
    }
  });
}


const searchInput = document.getElementById('searchInput');
searchInput.addEventListener('keypress', handleKeyPress);

