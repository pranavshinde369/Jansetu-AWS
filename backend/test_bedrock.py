import boto3

def test_claude_connection():
    print("Initiating connection to AWS Bedrock using the Converse API...")
    try:
        # Initialize the Bedrock runtime client
        bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')

        # The exact Model ID from your AWS console
        model_id = 'us.anthropic.claude-sonnet-4-6'

        # The message format for the Converse API
        messages = [
            {
                "role": "user",
                "content": [{"text": "Hello Claude! If you receive this, reply with 'AWS connection successful for JanSetu!'"}]
            }
        ]

        # Send the request using the parameters from your CLI snippet
        response = bedrock.converse(
            modelId=model_id,
            messages=messages,
            inferenceConfig={
                "maxTokens": 300,
                "temperature": 1
            }
        )

        # Parse the response
        reply = response['output']['message']['content'][0]['text']
        
        print("\n✅ SUCCESS! Claude replied:")
        print(f"🤖: {reply}\n")

    except Exception as e:
        print("\n❌ Error connecting to Bedrock:")
        print(e)

if __name__ == "__main__":
    test_claude_connection()