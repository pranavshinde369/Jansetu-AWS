# Requirements Document

## Introduction

JanSetu (Jan = People, Setu = Bridge between the people and the government.) is a voice-first AI agent designed to help daily wage workers and rural Indians navigate government bureaucracy through natural language interactions in their local dialects. The system accepts voice input via WhatsApp or phone calls, understands user needs, guides them through government scheme applications, and generates pre-filled PDF forms for submission.

## Glossary

- **JanSetu**: The complete AI agent system for government scheme assistance
- **Voice_Processor**: Component handling audio input/output and speech recognition/synthesis
- **Dialect_Handler**: Component managing multi-dialect support and language detection
- **Scheme_Agent**: AI reasoning component that identifies appropriate government schemes
- **Form_Generator**: Component that creates pre-filled PDF application forms
- **RAG_System**: Retrieval-Augmented Generation system for accessing scheme information
- **Guardrail_System**: Component preventing AI hallucinations and ensuring accuracy
- **User**: Daily wage worker or rural Indian seeking government scheme assistance

## Requirements

### Requirement 1: Voice Input Processing

**User Story:** As a daily wage worker, I want to speak to the system in my natural voice, so that I can communicate my needs without typing or reading complex forms.

#### Acceptance Criteria

1. WHEN a user calls the phone number, THE Voice_Processor SHALL accept and record audio input
2. WHEN a user sends a WhatsApp voice note, THE Voice_Processor SHALL receive and process the audio message
3. WHEN audio input is received, THE Voice_Processor SHALL convert speech to text using Bhashini API
4. WHEN speech-to-text conversion completes, THE Voice_Processor SHALL pass the text to the Scheme_Agent for processing
5. WHEN the system responds, THE Voice_Processor SHALL convert text responses to speech using Bhashini TTS
6. WHEN audio quality is poor, THE Voice_Processor SHALL request the user to repeat their message

### Requirement 2: Dialect Handling

**User Story:** As a rural Indian who speaks Bhojpuri or other local dialects, I want the system to understand my language, so that I can communicate naturally without learning Hindi or English.

#### Acceptance Criteria

1. WHEN a user speaks in any supported Indian dialect, THE Dialect_Handler SHALL detect the language automatically
2. WHEN language detection is uncertain, THE Dialect_Handler SHALL ask the user to confirm their preferred language
3. THE Dialect_Handler SHALL support Hindi, Bhojpuri, and at least 5 other major Indian languages
4. WHEN processing dialect-specific terms, THE Dialect_Handler SHALL maintain context and meaning accuracy
5. WHEN responding to users, THE Dialect_Handler SHALL generate responses in the same dialect as the input
6. WHEN a dialect is not supported, THE Dialect_Handler SHALL inform the user and offer Hindi as an alternative

### Requirement 3: Government Scheme Identification

**User Story:** As a user seeking government assistance, I want the system to identify which schemes I'm eligible for, so that I can access the right benefits without confusion.

#### Acceptance Criteria

1. WHEN a user describes their situation, THE Scheme_Agent SHALL analyze their needs against available government schemes
2. WHEN multiple schemes are applicable, THE Scheme_Agent SHALL present options ranked by relevance and eligibility
3. THE Scheme_Agent SHALL ask clarifying questions to determine exact eligibility requirements
4. WHEN scheme information is retrieved, THE RAG_System SHALL provide accurate and up-to-date scheme details
5. WHEN a user is ineligible for requested schemes, THE Scheme_Agent SHALL suggest alternative schemes or next steps
6. THE Scheme_Agent SHALL explain scheme benefits and requirements in simple, dialect-appropriate language

### Requirement 4: Hallucination Guardrails

**User Story:** As a user relying on government scheme information, I want the system to provide only accurate information, so that I don't waste time on incorrect applications or miss important requirements.

#### Acceptance Criteria

1. WHEN the Scheme_Agent generates responses, THE Guardrail_System SHALL verify information against the RAG_System knowledge base
2. WHEN uncertain about scheme details, THE Guardrail_System SHALL explicitly state uncertainty and recommend official verification
3. THE Guardrail_System SHALL prevent the system from inventing non-existent schemes or requirements
4. WHEN asked about information not in the knowledge base, THE Guardrail_System SHALL direct users to official government sources
5. THE Guardrail_System SHALL flag and block responses containing potentially harmful or misleading information
6. WHEN scheme information changes, THE Guardrail_System SHALL ensure outdated information is not provided

### Requirement 5: Offline PDF Generation

**User Story:** As a user in an area with limited internet connectivity, I want to receive a complete PDF form that I can print and submit offline, so that poor connectivity doesn't prevent me from applying for schemes.

#### Acceptance Criteria

1. WHEN user information is collected, THE Form_Generator SHALL create a pre-filled PDF application form
2. THE Form_Generator SHALL support all major government scheme application formats
3. WHEN generating PDFs, THE Form_Generator SHALL ensure all required fields are populated with user-provided information
4. WHEN optional fields are empty, THE Form_Generator SHALL clearly mark them for manual completion
5. THE Form_Generator SHALL include instructions in the user's dialect for form submission
6. WHEN PDF generation completes, THE Form_Generator SHALL deliver the form via WhatsApp or provide download instructions
7. THE Form_Generator SHALL generate forms that are compatible with government submission systems

### Requirement 6: Conversational Flow Management

**User Story:** As a user unfamiliar with government processes, I want the system to guide me step-by-step through the application process, so that I don't miss important information or requirements.

#### Acceptance Criteria

1. WHEN a conversation begins, THE Scheme_Agent SHALL greet the user and ask about their needs in their detected dialect
2. WHEN collecting information, THE Scheme_Agent SHALL ask one question at a time to avoid confusion
3. WHEN a user provides incomplete information, THE Scheme_Agent SHALL ask specific follow-up questions
4. WHEN all required information is collected, THE Scheme_Agent SHALL summarize the application before generating the PDF
5. THE Scheme_Agent SHALL maintain conversation context throughout the entire interaction
6. WHEN a user wants to restart or change their application, THE Scheme_Agent SHALL allow them to modify previous responses

### Requirement 7: Multi-Channel Communication

**User Story:** As a user with varying access to technology, I want to interact with the system through multiple channels, so that I can use whatever communication method is available to me.

#### Acceptance Criteria

1. THE JanSetu SHALL accept voice calls through a dedicated phone number
2. THE JanSetu SHALL receive and respond to WhatsApp voice messages
3. THE JanSetu SHALL provide a React PWA interface for users with smartphone access
4. WHEN switching between channels, THE JanSetu SHALL maintain user session and conversation state
5. WHEN a channel is unavailable, THE JanSetu SHALL inform users about alternative access methods
6. THE JanSetu SHALL provide consistent functionality across all supported channels

### Requirement 8: Data Privacy and Security

**User Story:** As a user sharing personal information for government applications, I want my data to be secure and private, so that my personal details are protected from misuse.

#### Acceptance Criteria

1. WHEN collecting user data, THE JanSetu SHALL encrypt all personal information in transit and at rest
2. THE JanSetu SHALL not store audio recordings after processing is complete
3. WHEN generating PDFs, THE JanSetu SHALL include only necessary information for the specific scheme application
4. THE JanSetu SHALL comply with Indian data protection regulations
5. WHEN users request data deletion, THE JanSetu SHALL remove all stored personal information
6. THE JanSetu SHALL provide users with clear information about what data is collected and how it's used