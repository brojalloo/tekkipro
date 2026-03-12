import requests

response = requests.get('https://api.github.com')

print('Status code:', response.status_code)
print('Réponse JSON:', response.json())
