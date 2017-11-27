This code takes a Twine story and spits out a map of question IDs to the question-asking HTML.

This happens automatically before the build process.

The output ends up in `client/data/decision-data.json`, and is not committed.

Here are some things to know about the current parsing/output process:

- markdown styling is applied via [remarkable](https://github.com/jonschlinkert/remarkable)
- the name of the passage is added as a `h2` header at the top
- anything after the last separator (`---`) is put inside of a `div` with class `decision-footer`
- the list of answers (identified by assuming that any bullet list that contains only links is the answer list) is given the class `answer-links`

To edit how these things all end up looking in the app, see `client/routes/app/respirator-picker/RespiratorPicker.html`
