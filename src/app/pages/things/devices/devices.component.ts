import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { NbDialogService } from '@nebular/theme';

import { LocalDataSource } from 'ng2-smart-table';
import { Thing } from 'app/common/interfaces/mainflux.interface';

import { ThingsService } from 'app/common/services/things/things.service';
import { NotificationsService } from 'app/common/services/notifications/notifications.service';
import { ConfirmationComponent } from 'app/shared/confirmation/confirmation.component';

import { DetailsComponent } from 'app/shared/details/details.component';

@Component({
  selector: 'ngx-smart-table',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.scss'],
})
export class DevicesComponent implements OnInit {
  settings = {
    add: {
      addButtonContent: '<i class="nb-plus"></i>',
      createButtonContent: '<i class="nb-checkmark"></i>',
      cancelButtonContent: '<i class="nb-close"></i>',
      confirmCreate: true,
    },
    edit: {
      editButtonContent: '<i class="nb-edit"></i>',
      saveButtonContent: '<i class="nb-checkmark"></i>',
      cancelButtonContent: '<i class="nb-close"></i>',
      confirmSave: true,
    },
    delete: {
      deleteButtonContent: '<i class="nb-trash"></i>',
      confirmDelete: true,
    },
    columns: {
      name: {
        title: 'Name',
        type: 'string',
        filter: false,
      },
      id: {
        title: 'ID',
        editable: 'false',
        addable: false,
        filter: false,
      },
      details: {
        title: 'Details',
        type: 'custom',
        renderComponent: DetailsComponent,
        valuePrepareFunction: (cell, row) => {
          return row;
        },
        editable: false,
        addable: false,
        filter: false,
      },
    },
    pager: {
      display: true,
      perPage: 6,
    },
  };

  source: LocalDataSource = new LocalDataSource();
  things: Observable<Thing[]>;

  thingsNumber = 0;

  offset = 0;
  limit = 100;

  constructor(
    private dialogService: NbDialogService,
    private thingsService: ThingsService,
    private notificationsService: NotificationsService,
  ) { }

  ngOnInit() {
    this.getThings();
  }

  getThings(): void {
    this.thingsService.getThings(this.offset, this.limit).subscribe(
      (resp: any) => {
        this.things = resp.things;
        this.thingsNumber = resp.total;

        // Load and refresh ngx-admin table
        this.source.load(resp.things);
        this.source.refresh();
      },
    );
  }

  onCreateConfirm(event): void {
    // close edditable row
    event.confirm.resolve();

    this.thingsService.addThing(event.newData).subscribe(
      resp => {
        this.notificationsService.success('Device successfully created', '');
        this.getThings();
      },
    );
  }

  onEditConfirm(event): void {
    // close edditable row
    event.confirm.resolve();

    this.thingsService.editThing(event.newData).subscribe(
      resp => {
        this.notificationsService.success('Device successfully edited', '');
      },
    );
  }

  onDeleteConfirm(event): void {
    this.dialogService.open(ConfirmationComponent, { context: { type: 'device' } }).onClose.subscribe(
      confirm => {
        if (confirm) {
          // close edditable row
          event.confirm.resolve();

          this.thingsService.deleteThing(event.data.id).subscribe(
            resp => {
              this.notificationsService.success('Device successfully deleted', '');
            },
          );
        }
      },
    );
  }

  onFileSelected(files: FileList) {
    if (files && files.length > 0) {
      const file: File = files.item(0);
      const reader: FileReader = new FileReader();
      reader.readAsText(file);
      reader.onload = () => {
        const csv: string = reader.result as string;
        const lines = csv.split('\n');
        const things: Thing[] = [];

        lines.forEach( line => {
          const col = line.split('|');
          const name = col[0];
          if (name !== '' && name !== '<empty string>') {
            let metadata = {};
            if (col[1] !== undefined) {
              try {
                metadata = JSON.parse(col[1]);
              } catch (e) {
                this.notificationsService.warn('Wrong metadata format', '');
              }
            }
            const thing = {
              name: name,
              metadata: metadata,
            };
            things.push(thing);
          }
        });

        this.thingsService.addThings(things).subscribe(
          resp => {
            this.getThings();
          },
        );
      };
    }
  }
}
