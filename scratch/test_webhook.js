async function test(payload) {
  const url = 'https://dindon.app.n8n.cloud/webhook/mindfullnessx1';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    console.log('Payload:', JSON.stringify(payload));
    console.log('Status Code:', res.status);
    console.log('Response Body:', text || '<empty>');
    console.log('--------------------');
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

async function runAll() {
  await test({ chatInput: 'hi' });
  await test({ input: 'hi' });
  await test({ text: 'hi' });
  await test({ query: 'hi' });
  await test({ message: 'hi' });
}

runAll();
