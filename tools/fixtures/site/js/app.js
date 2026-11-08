// Fixture script: its effect (a class on <body>) must survive in the offline copy, which drops every script.
document.addEventListener('DOMContentLoaded', function () { document.body.classList.add('ready'); });
