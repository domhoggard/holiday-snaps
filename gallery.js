// Get references to DOM elements
var overlay   = document.getElementById('overlay');
var popupImage = document.getElementById('popupImage');
var closeBtn  = document.getElementById('closeBtn');
var galleryLinks = document.querySelectorAll('.gallery a');

// When a thumbnail is clicked, show the overlay and centered image
for (var i = 0; i < galleryLinks.length; i++) {
  galleryLinks[i].addEventListener('click', function(e) {
    e.preventDefault();  // Prevent navigating to the image file
    var imageSrc = this.getAttribute('href');
    popupImage.src = imageSrc;          // Set the popup image source to the full-size image
    overlay.style.display = 'flex';     // Show the overlay (uses flex to center content)
  });
}

// When the close button is clicked, hide the overlay
closeBtn.addEventListener('click', function(e) {
  e.stopPropagation();                 // Stop event from bubbling to overlay
  overlay.style.display = 'none';
});

// Optional: close the popup if user clicks outside the image (on the overlay background)
overlay.addEventListener('click', function(e) {
  if (e.target === overlay) {
    overlay.style.display = 'none';
  }
});

