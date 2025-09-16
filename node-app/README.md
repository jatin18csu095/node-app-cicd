import os
import openai
import argparse
from PyPDF2 import PdfReader

# Set your OpenAI API Key
openai.api_key = os.getenv("OPENAI_API_KEY")

def load_pdf(file_path):
    """Extracts text from a PDF file"""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def ask_question(question, context):
    """Uses OpenAI to answer based on given context"""
    prompt = f"""
    You are a helpful assistant. Use the following context from two documents
    to answer the question in a clear Q&A format.

    Context:
    {context}

    Question:
    {question}

    Answer:
    """
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=400,
        temperature=0.2
    )
    return response["choices"][0]["message"]["content"].strip()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Q&A over Document1 & Document2")
    parser.add_argument("--doc1", type=str, required=True, help="Path to Document1")
    parser.add_argument("--doc2", type=str, required=True, help="Path to Document2")
    args = parser.parse_args()

    # Load documents
    doc1_text = load_pdf(args.doc1)
    doc2_text = load_pdf(args.doc2)

    combined_context = f"Document 1:\n{doc1_text}\n\nDocument 2:\n{doc2_text}"

    questions = [
        "How does the message structure for 'List of Participants by Discipline' in Cycling BMX Freestyle (Document 1) differ when applied to Cycling BMX Racing as described in Document 2?",
        "In Document 2, the Event Unit Start List and Results require certain triggers for BMX Racing. How would these triggers apply if adapted for BMX Freestyle as outlined in Document 1?",
        "How does the Event Final Ranking message in BMX Racing (Document 2) influence the format and data requirements for a similar message in BMX Freestyle (Document 1)?",
        "What are the specific ways the 'Applicable Messages' section for BMX Racing (Document 2) alters the permitted use of the Cycling BMX Freestyle Data Dictionary (Document 1)?",
        "How does the implementation of the 'ExtendedInfo' types in BMX Racing (Document 2) affect the development of BMX Freestyle standards based on guidelines in Document 1?"
    ]

    for i, q in enumerate(questions, 1):
        print(f"\nQ{i}: {q}")
        print("Answer:", ask_question(q, combined_context))