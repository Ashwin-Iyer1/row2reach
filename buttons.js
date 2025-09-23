const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
}


const searchName = 'Sundar Pichai'
const organization = 'Google'
const linkedin = 'https://www.linkedin.com/in/sundarpichai/'


document.getElementById('apollo-button').addEventListener('click', function() {
    const url = "https://api.apollo.io/api/v1/people/bulk_match"
    const headers = {
        accept: 'application/json',
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
        "x-api-key": window.env.electron_key
    }
    const body = JSON.stringify({
        details: [
            {
                name: searchName,
                organization_url: organization,
                linkedin_url: linkedin
            }
        ]
    });

    fetch(url, {
        method: 'POST',
        headers: headers,
        body: body
    }).then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        const matchesList = data.matches;

        // Extract all emails from matches
        const emails = matchesList
            .filter(match => match.email) // Filter out matches without emails
            .map(match => match.email); // Extract just the email addresses
        const emailText = emails.length > 0 
            ? emails.join(', ') 
            : 'No emails found';
        

        replaceText("apollo-data", emailText)
    })
    .catch((error) => {
        console.error('Error:', error);
    });
});

document.getElementById('zero-bounce-button').addEventListener('click', function() {
    const url = 'https://bulkapi.zerobounce.net/email-finder/sendfile';
    const params = new URLSearchParams({
        api_key: window.env.zerobounce_key,
        domain_column: '2',
        full_name_column: '1',
    });
    console.log('Zero Bounce clicked');
    document.getElementById('zero-bounce-data').innerText = 'Fetched Zero Bounce Data';
});
document.getElementById('contact-out-button').addEventListener('click', function() {
    console.log('Contact Out clicked');
    document.getElementById('contact-out-data').innerText = 'Fetched Contact Out Data';
});
