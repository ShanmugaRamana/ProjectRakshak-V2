// @desc    Display the home page
// @route   GET /
exports.getHomePage = (req, res) => {
    // This tells Express to find and render the 'home.ejs' file
    // and pass it a variable named 'title'.
    res.render('home', { title: 'Rakshak - Home' });
};