// @desc    Show the login page
// @route   GET /auth/login
exports.getLoginPage = (req, res) => {
    res.render('login', { title: 'Admin Login', error: null });
};

// @desc    Process the login form submission
// @route   POST /auth/login
exports.postLogin = (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.user = {
            username: username
        };
        res.redirect('/dashboard');
    } else {
        res.render('login', {
            title: 'Admin Login',
            error: 'Invalid username or password.'
        });
    }
};

// @desc    Log the user out
// @route   GET /auth/logout
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/dashboard');
        }
        // After logout, redirect to the correct login page
        res.redirect('/auth/login');
    });
};
// @desc    Security Middleware to protect routes
exports.ensureAuth = (req, res, next) => {
    // Check if the user is logged in by looking for the session object
    if (req.session.user) {
        // If logged in, proceed to the next function (the actual page controller)
        return next();
    } else {
        // If not logged in, redirect them to the login page
        res.redirect('/auth/login');
    }
};