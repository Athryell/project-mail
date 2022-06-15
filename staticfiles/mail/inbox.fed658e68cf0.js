document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', workaround_to_avoid_unwanted_data);

  // By default, load the inbox
  load_mailbox('inbox');

  document.addEventListener('submit', async function(event){
    event.preventDefault();
    await send_Email();
    load_mailbox('sent');
  })
});

function display_mail(mail_id) {
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#display-view').style.display = 'block';

  // Fetch content to display
  fetch(`/emails/${mail_id}`)
  .then(response => response.json())
  .then(email => {
    display_content(email);
  });
}
  function display_content(email){
    const user_email = JSON.parse(document.getElementById('user_email').textContent);

    let archive_btn_text = 'Archive';
    let hide_unread_btn = 'hidden';
    let hide_archive_btn = '';

    if(email.archived){
      archive_btn_text = 'Unarchive';
    }

    if(user_email === email.sender){ //it means that the user sent the mail
      hide_archive_btn = 'hidden';
    }

    if(email.read){
      hide_unread_btn = '';
    }

    document.querySelector('#display-view').innerHTML = 
    `<div><b>From:</b> ${email.sender}</div>
    
    <div><b>To:</b> ${email.recipients}</div>
    <div><b>Subject:</b> ${email.subject}</div>
    <div><b>Timestamp:</b> ${email.timestamp}</div>
    <button onclick="compose_email(this)" class="btn btn-outline-primary m-2 ms-0" id="reply"
      data-sender="${email.sender}"
      data-subject="${email.subject}" 
      data-timestamp="${email.timestamp}"
      data-body="${email.body}"
      data-fullMail="${email}">
        Reply
    </button>
    <button ${hide_archive_btn} onclick="change_archive_status(${email.archived}, ${email.id})" class="btn btn-outline-secondary m-2">
      ${archive_btn_text}
    </button>
    <button ${hide_unread_btn} onclick="tag_as_unread(${email.id})" class="btn btn-outline-secondary">
      Tag as "unread"
    </button>
    <hr>

    <div>${email.body}</div>`;

    tag_as_read(email.id);
}

function tag_as_read(email_id){
  fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  })
}

async function tag_as_unread(email_id){
  await fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: false
    })
  })

  load_mailbox('inbox');
}

async function change_archive_status(isEmailArchived, mail_id){
  if (!isEmailArchived){
    await archive_mail(mail_id);
  }else{
    await unarchive_mail(mail_id)
  }

  load_mailbox('inbox');
}

async function archive_mail(mail_id){
  return fetch(`/emails/${mail_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: true
    })
  })
}

async function unarchive_mail(mail_id){
  return fetch(`/emails/${mail_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: false
    })
  })
}

// When called from listener (line 7) it passes unwanted data
function workaround_to_avoid_unwanted_data(){
  compose_email();
}

function compose_email(obj = '') {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';
  document.querySelector('#display-view').style.display = 'none';

  if (obj === ''){
    // Clear out composition fields

    document.querySelector('#compose-recipients').value = '';
    document.querySelector('#compose-subject').value = '';
    document.querySelector('#compose-body').value = '';
  }else{
    document.querySelector('#compose-recipients').value = obj.dataset.sender;
    
    // Check if 'Re: ' is already at the beginning of the subject text or add it
    if (obj.dataset.subject.substring(0, 3).includes('Re:')){
      subject_text = obj.dataset.subject;
    }else{
      subject_text = 'Re: ' + obj.dataset.subject;
    }
    document.querySelector('#compose-subject').value = subject_text;

    let body_intro = 'On ' + obj.dataset.timestamp + ', ' + obj.dataset.sender + ' wrote:\n';

    document.querySelector('#compose-body').value = body_intro + obj.dataset.body;
  }

  // HACK: Added the "submit "event listener to DOMContentLoaded to load it only once
};

async function send_Email() {

  const mailRecipients = document.querySelector('#compose-recipients').value;
  const mailSubject = document.querySelector('#compose-subject').value;
  const mailBody = document.querySelector('#compose-body').value;
  
  return fetch('/emails',{
    method: 'POST',
    body: JSON.stringify({
      recipients: mailRecipients,
      subject: mailSubject,
      body: mailBody
    })
  })
  .then(response => response.json())
  .then(result => {
    // console.log(result); // TODO Debug purposes
  })
}

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#display-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
  
  fetch(`/emails/${mailbox}`)
  .then(response => response.json())
  .then(emails => {
    emails.forEach(add_mail);

    // Add Event Listener to show a specific mail
    document.querySelector('#emails-view').addEventListener('click', event => {
      const element = event.target;

      if (element.parentElement.className.includes('email')){
        let mail_id = element.parentElement.dataset.id;
        display_mail(mail_id);
      }
      else if (element.parentElement.parentElement.className.includes('email')){
        let mail_id = element.parentElement.parentElement.dataset.id;
        display_mail(mail_id);
      }
    })
  });

  function add_mail(contents){
    // Display senders of recipients according to the current mailbox
    let from_or_to = '';
    if (mailbox === 'sent'){
      from_or_to = `To: <b>${contents.recipients}</b>`;
    }
    else{
      from_or_to = `From: <b>${contents.sender}</b>`;
    }

    // Create new mail
    const email_box = document.createElement('div');
    email_box.className = `email row border m-2`;
    email_box.dataset.id = contents.id;
    email_box.style = "cursor: pointer";
    email_box.innerHTML = 
    `<div class="col">${from_or_to}</div>
    <div class="col-6 me-auto"> ${contents.subject} </div>
    <div class="col text-end text-muted">${contents.timestamp}</div>`;
    
    // Grey background if the mail is already read
    if(contents.read){
      email_box.style.background = 'Gainsboro';
    }

    // Add mail to DOM
    document.querySelector('#emails-view').append(email_box);
  }
}
