import json
import os
import sys

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI()

schema = {
    "type": "object",
    "properties": {
        "documents": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                   "path": { "type": "string" },
                   "lines": {
                       "type": "array",
                       "items": { "type": "string" }
                   }
                },
                "additionalProperties": False,
                "required": [
                    "path", 
                    "lines", 
                ],
            }
        },
    },
    "additionalProperties": False,
    "required": ["documents",]
}

rules = [
    'You are a helpful assistant. Always respond in valid JSON format. Always include the unmodified path in the response.',
    'Documents are provided in <file></file> XML elements, where <path></path> contains the path and <content></content> contains the document text.',
    'Highlight all documents by placing XML tags into each document around the most important information.',
    'There is a limit of ten tags per document.',
    'The XML tags must be called "<tg>".', 
    'Each <tg> tag must have a unique attribute "i", a unique attribute "c" which is a hex color from a pastel palette, and a unique attribute "n" which is a short summary of the tag.',
    'Here is a short example: <tg i="1" c="#FD8A8A" n="password policy">Password policy</tg> requires that users <tg i="2" c="#9EA1D4" n="password rotation">rotate their passwords</tg> every six months.'
    'Do not duplicate tags, tag ids, or tag colors.'
    'Separate the resulting content into lines and place them into the lines array. Be sure to also include empty lines in the output array.',
    'Do not add any additional characters to the start or end of each line.'
]

def get_content(path, offset, length):
   doc = documents.get(path)
   if doc is None: return ''
   
   if not length: return ''
   
   s = doc[offset:offset + length]
   print(f"getting content for {path} at [{offset}:{offset + length}] = {s}")
   return s

def get_structured_response(messages=[]):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "tags",
                "schema": schema,
                "strict": True,
            },
        },
    )
    
    message = response.choices[0].message
    messages.append(message.model_dump())
    return messages

def process_response(messages=[]):
    
    message = messages[-1]

    if not message.get('tool_calls'):
        # If there are no tool calls, we're done
        return messages, False

    cont = True
    # Process all tool calls
    for tool_call in message.get('tool_calls'):
        function_name = tool_call.get('function').get('name')
        function_args = json.loads(tool_call.get('function').get('arguments'))

        if function_name == "get_content":
            path = function_args.get("path")
            offset = function_args.get("offset")
            length = function_args.get("length")
            content = get_content(path, offset, length)
            cont = True
        else:
            content = f"Invalid function name in tool call \"{tool_call.get('id')}\""
            cont = False

        messages.append(
            {
                "role": "tool",
                "tool_call_id": tool_call.get('id'),
                "name": function_name,
                "content": content,
            }
        )
        
    return messages, cont


paths = [
    './corvidae.md'
]

documents = dict()
        
if len(sys.argv[1:]):
    for arg in sys.argv[1:]:
        try:
            input = json.loads(arg)
            name = input.get('name')
            contents = input.get('contents')
            if name is None or contents is None: continue
            documents[name] = contents
        except:
            pass
else:
    for path in paths:
        with open(path, 'r', encoding='utf8') as document:
            documents[path] = document.read()

if not len(documents.items()):
    print('{ "error": "no documents", "type": "documents" }')
    

# start with system rules and documents of interest
messages = [
    {
        "role": "system",
        "content": '\n'.join(rules)
    }
] + [ 
    {
        "role": "user", 
        "content": '\n'.join([
            'Process the following documents contained in the XML tags. Break up the document into individual words for an easier time calculating positions.' ] + [
            f'<file>\n<path>\n{path}\n</path>\n<content>\n{content}\n</content>\n</file>' for path, content in documents.items()
        ])
    }
]

if len(sys.argv[1:]):
    try:
        messages = get_structured_response(messages)
        messages, cont = process_response(messages)

        result = messages[-1].get('content')
        parsed = json.loads(result)
        json.dump(parsed, sys.stdout, indent=2)
    except json.JSONDecodeError as err:
        print(f'{{ "error": "{str(err)}", "type": "json_decode" }}')
    except:
        print(f'{{ "error": "unknown error", "type": "generic" }}')
else:
    messages = get_structured_response(messages)
    messages, cont = process_response(messages)

    result = messages[-1].get('content')
    print(result)