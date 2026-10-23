> **Historical proposal snapshot v1.0 — ไม่ใช่กติกาที่อนุมัติทั้งหมด:** source `94282b6` (Windows staging PR #1), ไม่ใช่ main `4a0b76b`. ข้อความเก่าที่ว่า D01–D12 ยังไม่อนุมัติ / acceptor optional / baseline deferred ถูกแทนด้วย [decisions](../delivery-decisions.md) และ [rules](../delivery-rules.md). รายละเอียดอื่นเป็นข้อเสนอเท่านั้น; ไม่มีผลทดสอบ runtime ใหม่. ดู [provenance](../audit/README.md).

# Source contract field ledger — HEAD94282b6

Exact existing wire schema evidence, not new-scope approval. UTF-16 bounds and defaults below are authoritative contract values; UI-specific omissions are described in chapters. Source: contracts/openapi.json. Technical fields not user inputs remain read-only per dictionary.

## CreateProject
`contracts/openapi.json:16483`; required: ["owner_team_id", "name"]
```json
{
  "type": "object",
  "properties": {
    "owner_team_id": {
      "$ref": "#/components/schemas/Id"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "description": {
      "type": "string",
      "minLength": 0,
      "maxLength": 2000,
      "x-utf16MaxLength": 2000,
      "default": ""
    },
    "project_type": {
      "$ref": "#/components/schemas/ProjectType"
    },
    "project_category": {
      "$ref": "#/components/schemas/ProjectCategory"
    }
  },
  "required": [
    "owner_team_id",
    "name"
  ],
  "additionalProperties": false
}
```

## PatchProject
`contracts/openapi.json:16516`; required: ["version"]
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "description": {
      "type": "string",
      "minLength": 0,
      "maxLength": 2000,
      "x-utf16MaxLength": 2000
    },
    "project_type": {
      "$ref": "#/components/schemas/ProjectType"
    },
    "project_category": {
      "$ref": "#/components/schemas/ProjectCategory"
    },
    "archived": {
      "type": "boolean"
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "minProperties": 2
}
```

## Project
`contracts/openapi.json:12071`; required: ["id", "owner_team_id", "owner_team_name", "name", "description", "project_type", "project_category", "code", "archived_at", "version", "created_by", "created_at", "updated_at", "effective_access"]
```json
{
  "type": "object",
  "properties": {
    "id": {
      "$ref": "#/components/schemas/Id"
    },
    "owner_team_id": {
      "$ref": "#/components/schemas/Id"
    },
    "owner_team_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "description": {
      "type": "string",
      "minLength": 0,
      "maxLength": 2000,
      "x-utf16MaxLength": 2000
    },
    "project_type": {
      "$ref": "#/components/schemas/ProjectType"
    },
    "project_category": {
      "$ref": "#/components/schemas/ProjectCategory"
    },
    "code": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 16,
          "x-utf16MaxLength": 16
        },
        {
          "type": "null"
        }
      ]
    },
    "archived_at": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Timestamp"
        },
        {
          "type": "null"
        }
      ]
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    },
    "created_by": {
      "$ref": "#/components/schemas/Id"
    },
    "created_at": {
      "$ref": "#/components/schemas/Timestamp"
    },
    "updated_at": {
      "$ref": "#/components/schemas/Timestamp"
    },
    "effective_access": {
      "type": "string",
      "enum": [
        "admin",
        "lead",
        "manager",
        "editor",
        "viewer"
      ]
    }
  },
  "required": [
    "id",
    "owner_team_id",
    "owner_team_name",
    "name",
    "description",
    "project_type",
    "project_category",
    "code",
    "archived_at",
    "version",
    "created_by",
    "created_at",
    "updated_at",
    "effective_access"
  ],
  "additionalProperties": false
}
```

## ProjectMember
`contracts/openapi.json:12170`; required: ["user", "job_title", "explicit_access", "effective_access", "assignee_eligible"]
```json
{
  "type": "object",
  "properties": {
    "user": {
      "$ref": "#/components/schemas/Person"
    },
    "job_title": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 50,
          "x-utf16MaxLength": 50,
          "pattern": "\\S"
        },
        {
          "type": "null"
        }
      ]
    },
    "explicit_access": {
      "anyOf": [
        {
          "type": "string",
          "enum": [
            "manager",
            "editor",
            "viewer"
          ]
        },
        {
          "type": "null"
        }
      ]
    },
    "effective_access": {
      "type": "string",
      "enum": [
        "admin",
        "lead",
        "manager",
        "editor",
        "viewer"
      ]
    },
    "assignee_eligible": {
      "type": "boolean"
    }
  },
  "required": [
    "user",
    "job_title",
    "explicit_access",
    "effective_access",
    "assignee_eligible"
  ],
  "additionalProperties": false
}
```

## CreateTeam
`contracts/openapi.json:16388`; required: ["name"]
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "description": {
      "type": "string",
      "minLength": 0,
      "maxLength": 1000,
      "x-utf16MaxLength": 1000,
      "default": ""
    },
    "members": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "user_id": {
            "$ref": "#/components/schemas/Id"
          },
          "team_position": {
            "$ref": "#/components/schemas/TeamPosition"
          }
        },
        "required": [
          "user_id",
          "team_position"
        ],
        "additionalProperties": false
      },
      "maxItems": 100
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

## PatchTeam
`contracts/openapi.json:16431`; required: ["version"]
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "description": {
      "type": "string",
      "minLength": 0,
      "maxLength": 1000,
      "x-utf16MaxLength": 1000
    },
    "archived": {
      "type": "boolean"
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "minProperties": 2
}
```

## TeamMembership
`contracts/openapi.json:16460`; required: ["team_role", "version"]
```json
{
  "type": "object",
  "properties": {
    "team_role": {
      "type": "string",
      "enum": [
        "lead",
        "member"
      ]
    },
    "team_position": {
      "$ref": "#/components/schemas/TeamPosition"
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "team_role",
    "version"
  ],
  "additionalProperties": false
}
```

## CreateTask
`contracts/openapi.json:15831`; required: ["project_id", "title"]
```json
{
  "type": "object",
  "properties": {
    "project_id": {
      "$ref": "#/components/schemas/Id"
    },
    "group_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "description": {
      "type": "string",
      "minLength": 0,
      "maxLength": 10000,
      "x-utf16MaxLength": 10000,
      "default": ""
    },
    "category": {
      "type": "string",
      "minLength": 0,
      "maxLength": 80,
      "x-utf16MaxLength": 80,
      "default": ""
    },
    "priority": {
      "type": "string",
      "enum": [
        "low",
        "medium",
        "high",
        "urgent"
      ],
      "default": "medium"
    },
    "assignee_ids": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Id"
      },
      "maxItems": 100,
      "uniqueItems": true
    },
    "assignee_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "start_date": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Date"
        },
        {
          "type": "null"
        }
      ]
    },
    "due_date": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Date"
        },
        {
          "type": "null"
        }
      ]
    },
    "recurrence": {
      "type": "string",
      "enum": [
        "none",
        "daily",
        "weekly",
        "monthly"
      ],
      "default": "none"
    }
  },
  "required": [
    "project_id",
    "title"
  ],
  "additionalProperties": false
}
```

## PatchTask
`contracts/openapi.json:15933`; required: ["version"]
```json
{
  "type": "object",
  "properties": {
    "group_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "description": {
      "type": "string",
      "minLength": 0,
      "maxLength": 10000,
      "x-utf16MaxLength": 10000,
      "default": ""
    },
    "category": {
      "type": "string",
      "minLength": 0,
      "maxLength": 80,
      "x-utf16MaxLength": 80,
      "default": ""
    },
    "priority": {
      "type": "string",
      "enum": [
        "low",
        "medium",
        "high",
        "urgent"
      ],
      "default": "medium"
    },
    "assignee_ids": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Id"
      },
      "maxItems": 100,
      "uniqueItems": true
    },
    "assignee_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "start_date": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Date"
        },
        {
          "type": "null"
        }
      ]
    },
    "due_date": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Date"
        },
        {
          "type": "null"
        }
      ]
    },
    "recurrence": {
      "type": "string",
      "enum": [
        "none",
        "daily",
        "weekly",
        "monthly"
      ],
      "default": "none"
    },
    "status": {
      "$ref": "#/components/schemas/Status"
    },
    "group_before_task_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "minProperties": 2
}
```

## Task
`contracts/openapi.json:12342`; required: ["id", "task_no", "group_id", "project_id", "project_name", "owner_team_id", "owner_team_name", "title", "description", "category", "status", "priority", "assignee_ids", "assignees", "assignee_id", "assignee", "creator_id", "start_date", "due_date", "recurrence", "recurrence_anchor_day", "predecessor_task_id", "successor_task_id", "version", "created_at", "updated_at", "completed_at", "deleted_at", "deleted_by", "subtask_count", "subtask_done_count", "overdue"]
```json
{
  "type": "object",
  "properties": {
    "id": {
      "$ref": "#/components/schemas/Id"
    },
    "task_no": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 32,
          "x-utf16MaxLength": 32
        },
        {
          "type": "null"
        }
      ]
    },
    "group_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "project_id": {
      "$ref": "#/components/schemas/Id"
    },
    "project_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "owner_team_id": {
      "$ref": "#/components/schemas/Id"
    },
    "owner_team_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "description": {
      "type": "string",
      "minLength": 0,
      "maxLength": 10000,
      "x-utf16MaxLength": 10000
    },
    "category": {
      "type": "string",
      "minLength": 0,
      "maxLength": 80,
      "x-utf16MaxLength": 80
    },
    "status": {
      "$ref": "#/components/schemas/Status"
    },
    "priority": {
      "$ref": "#/components/schemas/Priority"
    },
    "assignee_ids": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Id"
      },
      "maxItems": 100,
      "uniqueItems": true
    },
    "assignees": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Person"
      },
      "maxItems": 100
    },
    "assignee_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "assignee": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Person"
        },
        {
          "type": "null"
        }
      ]
    },
    "creator_id": {
      "$ref": "#/components/schemas/Id"
    },
    "start_date": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Date"
        },
        {
          "type": "null"
        }
      ]
    },
    "due_date": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Date"
        },
        {
          "type": "null"
        }
      ]
    },
    "recurrence": {
      "$ref": "#/components/schemas/Recurrence"
    },
    "recurrence_anchor_day": {
      "anyOf": [
        {
          "type": "integer",
          "minimum": 1,
          "maximum": 31
        },
        {
          "type": "null"
        }
      ]
    },
    "predecessor_task_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "successor_task_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    },
    "created_at": {
      "$ref": "#/components/schemas/Timestamp"
    },
    "updated_at": {
      "$ref": "#/components/schemas/Timestamp"
    },
    "completed_at": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Timestamp"
        },
        {
          "type": "null"
        }
      ]
    },
    "deleted_at": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Timestamp"
        },
        {
          "type": "null"
        }
      ]
    },
    "deleted_by": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "subtask_count": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647
    },
    "subtask_done_count": {
      "type": "integer",
      "minimum": 0,
      "maximum": 2147483647
    },
    "overdue": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "task_no",
    "group_id",
    "project_id",
    "project_name",
    "owner_team_id",
    "owner_team_name",
    "title",
    "description",
    "category",
    "status",
    "priority",
    "assignee_ids",
    "assignees",
    "assignee_id",
    "assignee",
    "creator_id",
    "start_date",
    "due_date",
    "recurrence",
    "recurrence_anchor_day",
    "predecessor_task_id",
    "successor_task_id",
    "version",
    "created_at",
    "updated_at",
    "completed_at",
    "deleted_at",
    "deleted_by",
    "subtask_count",
    "subtask_done_count",
    "overdue"
  ],
  "additionalProperties": false
}
```

## CreateSubtask
`contracts/openapi.json:16572`; required: ["title", "task_version"]
```json
{
  "type": "object",
  "properties": {
    "remark": {
      "type": "string",
      "minLength": 0,
      "maxLength": 2000,
      "x-utf16MaxLength": 2000
    },
    "assignee_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "task_version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "title",
    "task_version"
  ],
  "additionalProperties": false
}
```

## PatchSubtask
`contracts/openapi.json:16608`; required: ["version", "task_version"]
```json
{
  "type": "object",
  "properties": {
    "remark": {
      "type": "string",
      "minLength": 0,
      "maxLength": 2000,
      "x-utf16MaxLength": 2000
    },
    "assignee_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "done": {
      "type": "boolean"
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    },
    "task_version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version",
    "task_version"
  ],
  "additionalProperties": false,
  "minProperties": 3
}
```

## DeleteSubtask
`contracts/openapi.json:16651`; required: ["version", "task_version"]
```json
{
  "type": "object",
  "properties": {
    "version": {
      "$ref": "#/components/schemas/Version"
    },
    "task_version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version",
    "task_version"
  ],
  "additionalProperties": false
}
```

## CreateGroup
`contracts/openapi.json:14527`; required: ["name"]
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "color": {
      "type": "string",
      "minLength": 7,
      "maxLength": 7,
      "x-utf16MaxLength": 7,
      "pattern": "^#[0-9a-fA-F]{6}$"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

## PatchGroup
`contracts/openapi.json:14550`; required: ["version"]
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "color": {
      "type": "string",
      "minLength": 7,
      "maxLength": 7,
      "x-utf16MaxLength": 7,
      "pattern": "^#[0-9a-fA-F]{6}$"
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "minProperties": 2
}
```

## TaskBatch
`contracts/openapi.json:15691`; required: ["operation", "items"]
```json
{
  "type": "object",
  "properties": {
    "operation": {
      "type": "string",
      "enum": [
        "patch",
        "delete"
      ]
    },
    "patch": {
      "type": "object",
      "properties": {
        "status": {
          "$ref": "#/components/schemas/Status"
        },
        "assignee_ids": {
          "type": "array",
          "items": {
            "$ref": "#/components/schemas/Id"
          },
          "maxItems": 100,
          "uniqueItems": true
        },
        "group_id": {
          "anyOf": [
            {
              "$ref": "#/components/schemas/Id"
            },
            {
              "type": "null"
            }
          ]
        }
      },
      "required": [],
      "additionalProperties": false,
      "minProperties": 1
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "$ref": "#/components/schemas/Id"
          },
          "version": {
            "$ref": "#/components/schemas/Version"
          }
        },
        "required": [
          "id",
          "version"
        ],
        "additionalProperties": false
      },
      "maxItems": 100,
      "minItems": 1
    }
  },
  "required": [
    "operation",
    "items"
  ],
  "additionalProperties": false
}
```

## TaskBatchResult
`contracts/openapi.json:15758`; required: ["results"]
```json
{
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": {
            "$ref": "#/components/schemas/Id"
          },
          "outcome": {
            "type": "string",
            "enum": [
              "updated",
              "deleted",
              "conflict",
              "forbidden",
              "not_found",
              "invalid"
            ]
          },
          "code": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 60,
                "x-utf16MaxLength": 60
              },
              {
                "type": "null"
              }
            ]
          },
          "current_version": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/Version"
              },
              {
                "type": "null"
              }
            ]
          },
          "item": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/Task"
              },
              {
                "type": "null"
              }
            ]
          }
        },
        "required": [
          "id",
          "outcome",
          "code",
          "current_version",
          "item"
        ],
        "additionalProperties": false
      },
      "maxItems": 100
    }
  },
  "required": [
    "results"
  ],
  "additionalProperties": false
}
```

## CreateComment
`contracts/openapi.json:16667`; required: ["body"]
```json
{
  "type": "object",
  "properties": {
    "body": {
      "type": "string",
      "minLength": 1,
      "maxLength": 5000,
      "x-utf16MaxLength": 5000,
      "pattern": "\\S"
    }
  },
  "required": [
    "body"
  ],
  "additionalProperties": false
}
```

## Attachment
`contracts/openapi.json:12894`; required: ["id", "task_id", "uploader", "original_name", "bytes", "validated_type", "sha256", "created_at", "deleted_at", "can_delete", "can_restore"]
```json
{
  "type": "object",
  "properties": {
    "id": {
      "$ref": "#/components/schemas/Id"
    },
    "task_id": {
      "$ref": "#/components/schemas/Id"
    },
    "uploader": {
      "$ref": "#/components/schemas/Person"
    },
    "original_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "bytes": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10485760
    },
    "validated_type": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100
    },
    "sha256": {
      "type": "string",
      "minLength": 64,
      "maxLength": 64,
      "x-utf16MaxLength": 64,
      "pattern": "^[a-f0-9]{64}$"
    },
    "created_at": {
      "$ref": "#/components/schemas/Timestamp"
    },
    "deleted_at": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Timestamp"
        },
        {
          "type": "null"
        }
      ]
    },
    "can_delete": {
      "type": "boolean"
    },
    "can_restore": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "task_id",
    "uploader",
    "original_name",
    "bytes",
    "validated_type",
    "sha256",
    "created_at",
    "deleted_at",
    "can_delete",
    "can_restore"
  ],
  "additionalProperties": false
}
```

## ProjectFile
`contracts/openapi.json:15543`; required: ["source", "id", "project_id", "task_id", "task_title", "uploader", "original_name", "bytes", "validated_type", "sha256", "created_at", "deleted_at", "download_path", "can_delete", "can_restore"]
```json
{
  "type": "object",
  "properties": {
    "source": {
      "type": "string",
      "enum": [
        "project",
        "task"
      ]
    },
    "id": {
      "$ref": "#/components/schemas/Id"
    },
    "project_id": {
      "$ref": "#/components/schemas/Id"
    },
    "task_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "task_title": {
      "anyOf": [
        {
          "type": "string",
          "minLength": 1,
          "maxLength": 200,
          "x-utf16MaxLength": 200,
          "pattern": "\\S"
        },
        {
          "type": "null"
        }
      ]
    },
    "uploader": {
      "$ref": "#/components/schemas/Person"
    },
    "original_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "bytes": {
      "type": "integer",
      "minimum": 1,
      "maximum": 10485760
    },
    "validated_type": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100
    },
    "sha256": {
      "type": "string",
      "minLength": 64,
      "maxLength": 64,
      "x-utf16MaxLength": 64,
      "pattern": "^[a-f0-9]{64}$"
    },
    "created_at": {
      "$ref": "#/components/schemas/Timestamp"
    },
    "deleted_at": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Timestamp"
        },
        {
          "type": "null"
        }
      ]
    },
    "download_path": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "^/api/(project-files|attachments)/[0-9]+/download$"
    },
    "can_delete": {
      "type": "boolean"
    },
    "can_restore": {
      "type": "boolean"
    }
  },
  "required": [
    "source",
    "id",
    "project_id",
    "task_id",
    "task_title",
    "uploader",
    "original_name",
    "bytes",
    "validated_type",
    "sha256",
    "created_at",
    "deleted_at",
    "download_path",
    "can_delete",
    "can_restore"
  ],
  "additionalProperties": false
}
```

## CreateDoc
`contracts/openapi.json:15446`; required: ["title"]
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "body_html": {
      "type": "string",
      "minLength": 0,
      "maxLength": 1000000,
      "x-utf16MaxLength": 1000000,
      "default": ""
    }
  },
  "required": [
    "title"
  ],
  "additionalProperties": false
}
```

## PatchDoc
`contracts/openapi.json:15469`; required: ["version"]
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "body_html": {
      "type": "string",
      "minLength": 0,
      "maxLength": 1000000,
      "x-utf16MaxLength": 1000000
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "minProperties": 2
}
```

## DocSummary
`contracts/openapi.json:15277`; required: ["id", "project_id", "title", "version", "created_by", "updated_by", "created_at", "updated_at", "deleted_at", "text_length", "can_edit", "can_delete", "can_restore"]
```json
{
  "type": "object",
  "properties": {
    "id": {
      "$ref": "#/components/schemas/Id"
    },
    "project_id": {
      "$ref": "#/components/schemas/Id"
    },
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 200,
      "x-utf16MaxLength": 200,
      "pattern": "\\S"
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    },
    "created_by": {
      "$ref": "#/components/schemas/Person"
    },
    "updated_by": {
      "$ref": "#/components/schemas/Person"
    },
    "created_at": {
      "$ref": "#/components/schemas/Timestamp"
    },
    "updated_at": {
      "$ref": "#/components/schemas/Timestamp"
    },
    "deleted_at": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Timestamp"
        },
        {
          "type": "null"
        }
      ]
    },
    "text_length": {
      "type": "integer",
      "minimum": 0,
      "maximum": 200000
    },
    "can_edit": {
      "type": "boolean"
    },
    "can_delete": {
      "type": "boolean"
    },
    "can_restore": {
      "type": "boolean"
    }
  },
  "required": [
    "id",
    "project_id",
    "title",
    "version",
    "created_by",
    "updated_by",
    "created_at",
    "updated_at",
    "deleted_at",
    "text_length",
    "can_edit",
    "can_delete",
    "can_restore"
  ],
  "additionalProperties": false
}
```

## DocVersions
`contracts/openapi.json:15495`; required: ["items"]
```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "version": {
            "$ref": "#/components/schemas/Version"
          },
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 200,
            "x-utf16MaxLength": 200,
            "pattern": "\\S"
          },
          "body_html": {
            "type": "string",
            "minLength": 0,
            "maxLength": 1000000,
            "x-utf16MaxLength": 1000000
          },
          "edited_by": {
            "$ref": "#/components/schemas/Person"
          },
          "edited_at": {
            "$ref": "#/components/schemas/Timestamp"
          }
        },
        "required": [
          "version",
          "title",
          "body_html",
          "edited_by",
          "edited_at"
        ],
        "additionalProperties": false
      },
      "maxItems": 1000
    }
  },
  "required": [
    "items"
  ],
  "additionalProperties": false
}
```

## CreateUser
`contracts/openapi.json:16268`; required: ["username", "display_name", "temp_password"]
```json
{
  "type": "object",
  "properties": {
    "username": {
      "$ref": "#/components/schemas/Username"
    },
    "display_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "temp_password": {
      "$ref": "#/components/schemas/Password"
    },
    "org_role": {
      "type": "string",
      "enum": [
        "admin",
        "member"
      ],
      "default": "member"
    },
    "email": {
      "$ref": "#/components/schemas/ContactEmail"
    },
    "telephone": {
      "$ref": "#/components/schemas/ContactTelephone"
    },
    "team_ids": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Id"
      },
      "maxItems": 100,
      "uniqueItems": true
    }
  },
  "required": [
    "username",
    "display_name",
    "temp_password"
  ],
  "additionalProperties": false
}
```

## PatchUser
`contracts/openapi.json:16314`; required: ["version"]
```json
{
  "type": "object",
  "properties": {
    "display_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "active": {
      "type": "boolean"
    },
    "org_role": {
      "type": "string",
      "enum": [
        "admin",
        "member"
      ]
    },
    "job_title_id": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "email": {
      "$ref": "#/components/schemas/ContactEmail"
    },
    "telephone": {
      "$ref": "#/components/schemas/ContactTelephone"
    },
    "team_ids": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Id"
      },
      "maxItems": 100,
      "uniqueItems": true
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "minProperties": 2
}
```

## PasswordReset
`contracts/openapi.json:16368`; required: ["admin_password", "temp_password", "version"]
```json
{
  "type": "object",
  "properties": {
    "admin_password": {
      "$ref": "#/components/schemas/CurrentPassword"
    },
    "temp_password": {
      "$ref": "#/components/schemas/Password"
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "admin_password",
    "temp_password",
    "version"
  ],
  "additionalProperties": false
}
```

## CreateJobTitle
`contracts/openapi.json:11684`; required: ["name"]
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "x-utf16MaxLength": 50,
      "pattern": "\\S"
    },
    "color": {
      "$ref": "#/components/schemas/HexColor"
    },
    "sort_order": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

## PatchJobTitle
`contracts/openapi.json:11708`; required: ["version"]
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "x-utf16MaxLength": 50,
      "pattern": "\\S"
    },
    "color": {
      "$ref": "#/components/schemas/HexColor"
    },
    "is_active": {
      "type": "boolean"
    },
    "sort_order": {
      "type": "integer",
      "minimum": 0,
      "maximum": 10000
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "minProperties": 2
}
```

## PermissionMatrix
`contracts/openapi.json:11835`; required: ["changes"]
```json
{
  "type": "object",
  "properties": {
    "changes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "user_id": {
            "$ref": "#/components/schemas/Id"
          },
          "keys": {
            "$ref": "#/components/schemas/PermissionKeys"
          },
          "permissions_version": {
            "$ref": "#/components/schemas/Version"
          }
        },
        "required": [
          "user_id",
          "keys",
          "permissions_version"
        ],
        "additionalProperties": false
      },
      "maxItems": 100,
      "minItems": 1
    }
  },
  "required": [
    "changes"
  ],
  "additionalProperties": false
}
```

## PutUserPermissions
`contracts/openapi.json:11819`; required: ["keys", "permissions_version"]
```json
{
  "type": "object",
  "properties": {
    "keys": {
      "$ref": "#/components/schemas/PermissionKeys"
    },
    "permissions_version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "keys",
    "permissions_version"
  ],
  "additionalProperties": false
}
```

## PatchOrganization
`contracts/openapi.json:16696`; required: ["version"]
```json
{
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "workload_threshold": {
      "type": "integer",
      "minimum": 1,
      "maximum": 1000
    },
    "version": {
      "$ref": "#/components/schemas/Version"
    }
  },
  "required": [
    "version"
  ],
  "additionalProperties": false,
  "minProperties": 2
}
```

## Login
`contracts/openapi.json:16101`; required: ["username", "password"]
```json
{
  "type": "object",
  "properties": {
    "username": {
      "$ref": "#/components/schemas/LoginIdentifier"
    },
    "password": {
      "$ref": "#/components/schemas/CurrentPassword"
    }
  },
  "required": [
    "username",
    "password"
  ],
  "additionalProperties": false
}
```

## Register
`contracts/openapi.json:16117`; required: ["email", "display_name", "password"]
```json
{
  "type": "object",
  "properties": {
    "email": {
      "type": "string",
      "minLength": 3,
      "maxLength": 254,
      "x-utf16MaxLength": 254,
      "format": "email"
    },
    "display_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "password": {
      "$ref": "#/components/schemas/Password"
    }
  },
  "required": [
    "email",
    "display_name",
    "password"
  ],
  "additionalProperties": false
}
```

## Setup
`contracts/openapi.json:16048`; required: ["token", "organization_name", "username", "display_name", "password"]
```json
{
  "type": "object",
  "properties": {
    "token": {
      "type": "string",
      "minLength": 32,
      "maxLength": 128,
      "x-utf16MaxLength": 128
    },
    "organization_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "username": {
      "$ref": "#/components/schemas/Username"
    },
    "display_name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "x-utf16MaxLength": 100,
      "pattern": "\\S"
    },
    "password": {
      "$ref": "#/components/schemas/Password"
    }
  },
  "required": [
    "token",
    "organization_name",
    "username",
    "display_name",
    "password"
  ],
  "additionalProperties": false
}
```

## PasswordChange
`contracts/openapi.json:16252`; required: ["current_password", "new_password"]
```json
{
  "type": "object",
  "properties": {
    "current_password": {
      "$ref": "#/components/schemas/CurrentPassword"
    },
    "new_password": {
      "$ref": "#/components/schemas/Password"
    }
  },
  "required": [
    "current_password",
    "new_password"
  ],
  "additionalProperties": false
}
```

## Preferences
`contracts/openapi.json:15138`; required: ["reduce_motion", "confetti", "column_widths", "hidden_tabs"]
```json
{
  "type": "object",
  "properties": {
    "reduce_motion": {
      "type": "boolean"
    },
    "confetti": {
      "type": "boolean"
    },
    "column_widths": {
      "type": "object",
      "propertyNames": {
        "pattern": "^[a-z_]{1,40}$"
      },
      "additionalProperties": {
        "type": "integer",
        "minimum": 60,
        "maximum": 800
      },
      "maxProperties": 30
    },
    "hidden_tabs": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": [
          "kanban",
          "calendar",
          "gantt",
          "docs",
          "files",
          "workload",
          "overview"
        ]
      },
      "maxItems": 7,
      "uniqueItems": true
    }
  },
  "required": [
    "reduce_motion",
    "confetti",
    "column_widths",
    "hidden_tabs"
  ],
  "additionalProperties": false
}
```

## TaskQuery
`contracts/openapi.json:16764`; required: []
```json
{
  "type": "object",
  "properties": {
    "q": {
      "type": "string",
      "minLength": 0,
      "maxLength": 100,
      "x-utf16MaxLength": 100
    },
    "team": {
      "$ref": "#/components/schemas/Id"
    },
    "project": {
      "$ref": "#/components/schemas/Id"
    },
    "assignee": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "creator": {
      "$ref": "#/components/schemas/Id"
    },
    "job_title": {
      "$ref": "#/components/schemas/Id"
    },
    "status": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Status"
      },
      "maxItems": 4,
      "minItems": 1,
      "uniqueItems": true
    },
    "priority": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Priority"
      },
      "maxItems": 4,
      "minItems": 1,
      "uniqueItems": true
    },
    "category": {
      "type": "string",
      "minLength": 0,
      "maxLength": 80,
      "x-utf16MaxLength": 80
    },
    "due_from": {
      "$ref": "#/components/schemas/Date"
    },
    "due_to": {
      "$ref": "#/components/schemas/Date"
    },
    "has_due": {
      "type": "boolean"
    },
    "date_basis": {
      "type": "string",
      "enum": [
        "created",
        "due",
        "completed"
      ]
    },
    "date_from": {
      "$ref": "#/components/schemas/Date"
    },
    "date_to": {
      "$ref": "#/components/schemas/Date"
    },
    "sort": {
      "type": "string",
      "enum": [
        "group_order",
        "due_asc",
        "due_desc",
        "created_asc",
        "created_desc",
        "updated_desc",
        "title_asc",
        "priority_desc"
      ]
    },
    "page": {
      "type": "integer",
      "minimum": 1,
      "maximum": 2147483647,
      "default": 1
    },
    "pageSize": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 50
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## ReportQuery
`contracts/openapi.json:16871`; required: []
```json
{
  "type": "object",
  "properties": {
    "q": {
      "type": "string",
      "minLength": 0,
      "maxLength": 100,
      "x-utf16MaxLength": 100
    },
    "team": {
      "$ref": "#/components/schemas/Id"
    },
    "project": {
      "$ref": "#/components/schemas/Id"
    },
    "assignee": {
      "anyOf": [
        {
          "$ref": "#/components/schemas/Id"
        },
        {
          "type": "null"
        }
      ]
    },
    "creator": {
      "$ref": "#/components/schemas/Id"
    },
    "job_title": {
      "$ref": "#/components/schemas/Id"
    },
    "status": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Status"
      },
      "maxItems": 4,
      "minItems": 1,
      "uniqueItems": true
    },
    "priority": {
      "type": "array",
      "items": {
        "$ref": "#/components/schemas/Priority"
      },
      "maxItems": 4,
      "minItems": 1,
      "uniqueItems": true
    },
    "category": {
      "type": "string",
      "minLength": 0,
      "maxLength": 80,
      "x-utf16MaxLength": 80
    },
    "due_from": {
      "$ref": "#/components/schemas/Date"
    },
    "due_to": {
      "$ref": "#/components/schemas/Date"
    },
    "has_due": {
      "type": "boolean"
    },
    "date_basis": {
      "type": "string",
      "enum": [
        "created",
        "due",
        "completed"
      ]
    },
    "date_from": {
      "$ref": "#/components/schemas/Date"
    },
    "date_to": {
      "$ref": "#/components/schemas/Date"
    }
  },
  "required": [],
  "additionalProperties": false
}
```

## WorkloadQuery
`contracts/openapi.json:14848`; required: []
```json
{
  "type": "object",
  "properties": {
    "from": {
      "$ref": "#/components/schemas/Date"
    },
    "weeks": {
      "type": "integer",
      "minimum": 1,
      "maximum": 12,
      "default": 6
    }
  },
  "required": [],
  "additionalProperties": false
}
```
