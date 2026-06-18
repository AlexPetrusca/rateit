export const backlogData = {
  title: 'To Do',
  sections: [
    {
      priority: 'P1',
      items: [
        'Dark mode',
        'Add filter for profile pages to order by date or review',
        'make topic page full image, scroll to see ratings and comments',
        'everyones a critic as refresh indicator',
        'Hitting return twice on a post or comment creates it multiple times. need to make sure its only created once.',
        'Add profile pic sizing to create account page',
        'Need the ability to @people in posts',
        'Pulling down on mobile doesnt always refresh the page. only if finger is in the top bar labeled "home". if the screen is being dragged and grey at the top is exposed, the screen should refresh.',
        'Clean up the `users` table so `first_name` and `last_name` are no longer required, and make `username` the required profile field instead. Ensure usernames have to be unique.',
        'Add a basic censor that stops you from posting slurs',
        'Add ability to edit topics',
        'Add the ability to make your account private so only approved followers can see your posts.',
        'Update ui to add photos, it should be first and have symbols for upload vs use camera',
        'Make the stars bigger, nicer, and flashier when rating.',
        'Split the feed into two views, one public and one following-only.',
        'Add a notifications pane for likes, comments, follows, and other activity.',
        'Resolve the container registry namespace mismatch so Critic backend and mocker images can live under the right owner/repo instead of depending on legacy RateIt image names.'
      ]
    },
    {
      priority: 'P2',
      items: [
        'have enter button on home page live in the bottom left',
        'There is a delay when loading things that seems unnecessary (alex item)',
        'Add the ability to tag your own ratings.',
        'Add videos.',
        'Fix the re-rate icon. The current cycle icon looks bad.'
      ]
    },
    {
      priority: 'P3',
      items: [
        'Find a way to categorize ratings.',
        'Make topics show an overall average rating and a way to view all ratings tied to a topic.',
        'Add a daily random thing generator to rate.',
        'Add people-tagging in reviews, including highlighted `@username` mentions and standardized self-references. Example: if OP writes "my waiter" and someone re-rates it, render that context as `OP_username\'s waiter`; words like `I` and `my` should be highlighted in the same blue style as tagged people.'
      ]
    },
    {
      priority: 'P4',
      items: [
        'Get the app into the App Store once the sideloadable build path is stable.',
        'Make the app sideloadable so it can be installed outside the dev workflow.',
        'Improve the phone-number entry flow for OTP: the current input now uses a country selector plus one autofill-friendly phone field with caret mapping for the formatted phone string, but it still needs the broader international pattern and more complete E.164 handling for non-US numbers.'
      ]
    }
  ]
};
