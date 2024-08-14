document.getElementById('confirm-age').addEventListener('click', function() {
    alert('You may proceed.');
    // You can redirect to the main content page here, e.g.,
    // window.location.href = 'main-content.html';
});

document.getElementById('deny-age').addEventListener('click', function() {
    var warningMessage = document.getElementById('warning-message');
    warningMessage.classList.remove('hidden');
    document.getElementById('confirm-age').style.display = 'none';
    this.style.display = 'none';
});