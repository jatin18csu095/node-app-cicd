from openai import OpenAI

# 🔑 Add your API key here
client = OpenAI(api_key="your_api_key_here")


def read_document(path):
    """Reads text content from a file safely."""
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()


def ask_openai(question, doc1, doc2):
    """Send question + docs to OpenAI and get Q&A style response."""
    prompt = f"""
    You are an expert in Olympic Data Feed standards.
    Below are two documents: Document 1 (Cycling BMX Freestyle) and Document 2 (Cycling BMX Racing).
    Based on their content, answer the following question in detail and in Q&A format.

    Document 1:
    {doc1[:1000]}

    Document 2:
    {doc2[:1000]}

    Question: {question}
    Answer:
    """

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=700,
        temperature=0.2
    )

    return response.choices[0].message.content.strip()


def main():
    # Load documents (make sure these files exist in the same folder)
    doc1 = read_document("Document1.txt")
    doc2 = read_document("Document2.txt")

    # Assignment questions
    questions = [
        "How does the message structure for 'List of Participants by Discipline' in Cycling BMX Freestyle (Document 1) differ when applied to Cycling BMX Racing as described in Document 2?",
        "In Document 2, the Event Unit Start List and Results require certain triggers for BMX Racing. How would these triggers apply if adapted for BMX Freestyle as outlined in Document 1?",
        "How does the Event Final Ranking message in BMX Racing (Document 2) influence the format and data requirements for a similar message in BMX Freestyle (Document 1)?",
        "What are the specific ways the 'Applicable Messages' section for BMX Racing (Document 2) alters the permitted use of the Cycling BMX Freestyle Data Dictionary (Document 1)?",
        "How does the implementation of the 'ExtendedInfo' types in BMX Racing (Document 2) affect the development of BMX Freestyle standards based on guidelines in Document 1?"
    ]

    print("\n=== Q&A Output ===\n")
    for idx, q in enumerate(questions, 1):
        answer = ask_openai(q, doc1, doc2)
        print(f"Q{idx}: {q}\nA{idx}: {answer}\n{'-'*60}\n")


if __name__ == "__main__":
    main()