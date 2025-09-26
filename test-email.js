const testEmail = {
  email: 'marlonbuelvas314@gmail.com',
  name: 'Marlon Test'
}

fetch('http://localhost:3000/api/test-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testEmail)
})
.then(response => response.json())
.then(data => {
  console.log('✅ Test result:', data)
})
.catch(error => {
  console.error('❌ Test error:', error)
})