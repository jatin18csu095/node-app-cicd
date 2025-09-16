import os
import argparse
from PyPDF2 import PdfReader
from openai import OpenAI

# 🔑 Directly paste your API key here
API_KEY = "sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
client = OpenAI(api_key=API_KEY)

def load_pdf(file_path):
    """Extracts text from a PDF file."""
    reader = PdfReader(file_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    return text

def ask_question(doc1_text, doc2_text, question):
    """Ask OpenAI a question using contents of Document1 and Document2."""
    context = f"""
    Document 1:
    {doc1_text[:2000]}  # limiting size for demo

    Document 2:
    {doc2_text[:2000]}

    Question: {question}
    """
    response = client.chat.completions.create(
        model="gpt-4o-mini",   # or "gpt-4o" if enabled
        messages=[
            {"role": "system", "content": "You are an assistant that answers questions based on provided documents."},
            {"role": "user", "content": context},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QnA over two documents using OpenAI API")
    parser.add_argument("--doc1", required=True, help="Path to Document1 PDF")
    parser.add_argument("--doc2", required=True, help="Path to Document2 PDF")
    parser.add_argument("-q", "--question", required=True, help="Question to ask")
    args = parser.parse_args()

    doc1_text = load_pdf(args.doc1)
    doc2_text = load_pdf(args.doc2)

    answer = ask_question(doc1_text, doc2_text, args.question)
    print("\n=== Answer ===\n")
    print(answer)